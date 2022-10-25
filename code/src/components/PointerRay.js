import * as THREE from "three";

export default class PointerRay{
	
	mouse = new THREE.Vector2()
	
	// Geometry to add to scene
	line
	raycaster
	
	// Property to keep track of all intersections, and the currently selected intersection.
	intersects = []
	intersection = {
		intersects: false,
		point: new THREE.Vector3(),
		normal: new THREE.Vector3()
	};
	
	// PointerRay interactions should be disabled on long navigation itneractions.
	enabled = true;
	
	// Property to track time since pointerdown.
	pointerdownTime
	longPressTimer
	
	constructor(camera){
		let obj = this;
		
		
		// Camera to use by the raycaster.
		obj.camera = camera;
		obj.raycaster = new THREE.Raycaster();


		
		// The line doesn't seem to work if it is not initialised near the surface. Why??
		const geometry = new THREE.BufferGeometry();
		geometry.setFromPoints( [ new THREE.Vector3(0.367, 100, 0.126), 
								  new THREE.Vector3(0.384, 100, 0.173) ] );
		obj.line = new THREE.Line( geometry, new THREE.LineBasicMaterial() );
		
		
		
		
		// Selecting the decal using a longpress. After a longpress a decal should not be placed. Reusing the 'moved' variable from 'addAimingRay'.
		window.addEventListener( 'pointerdown', function (event){
		    obj.enabled = true;
		  
		    obj.pointerdownTime = performance.now();
		    obj.longPressTimer = window.setTimeout(function(){ 
			    if( obj.enabled ){
			        obj.pointerdown(event);
			    } // if	
		    },1000); 
		}); // pointerdown

		window.addEventListener( 'pointerup', function (event){
		  
		    // When a decal is deselected `selectedDecal' becomes undefined, and therefore a new decal is added here. How should this check if a new decal is needed or not? Check with the longpress timer somehow?
		  
		    clearTimeout(obj.longPressTimer);
		  
		    let clickTime = performance.now() - obj.pointerdownTime;
		    // It seems like 100ms is a usual click time for me, but 200ms is on the safe side.
		    if ( obj.enabled && clickTime < 200) {
			    obj.pointerup(event);
		    } // if
		}); // pointerup
		

		// For now just focus on adding the pointer helper.
		window.addEventListener( 'pointermove', function (event){
			obj.pointermove(event);
		}); // onPointerMove
	
	} // constructor
	
	// Placeholder functions
	pointermove(){} // pointermove
	
	pointerup(){} // pointerup
	
	pointerdown(){} // pointerdown
	
	
	// Helper functions.
	checkIntersection( x, y, candidates) {
	// This should be adjusted so that the array of items to check the intersect against can be specified.
		let obj = this;
		
		
		if ( candidates.length < 1 ) return;

		obj.mouse.x = ( x / window.innerWidth ) * 2 - 1;
		obj.mouse.y = - ( y / window.innerHeight ) * 2 + 1;


		obj.raycaster.setFromCamera( obj.mouse, obj.camera );
		obj.raycaster.intersectObjects( candidates, false, obj.intersects );
		
		if ( obj.intersects.length > 0 ) {
			// Intersect point is the first point of the aimer line.
			const closest = obj.intersects[ 0 ];
			const p = closest.point;
			
			// The normal gets transformed into the second point here.
			const n = closest.face.normal.clone();
			n.multiplyScalar( 0.1 );
			n.add( closest.point );
			
			
			// Set the aiming line vertices.
			const positions = obj.line.geometry.attributes.position;
			positions.setXYZ( 0, p.x, p.y, p.z );
			positions.setXYZ( 1, n.x, n.y, n.z );
			positions.needsUpdate = true;


			// Intersection stores the intersect information for easier use later on.
			obj.intersection.point.copy( p );
			obj.intersection.normal.copy( closest.face.normal );
			obj.intersection.intersects = true;

			// Clear the intersects array.
			obj.intersects.length = 0;
			
			return closest
		} else {
			return false;
		} // if
	} // checkIntersection


	getLinePoint(i){
		let obj = this;
		return new THREE.Vector3( obj.line.geometry.attributes.position.getX(i),
								  obj.line.geometry.attributes.position.getY(i),
								  obj.line.geometry.attributes.position.getZ(i) )
	} // getLinePoint
	
	
} // PointerRay