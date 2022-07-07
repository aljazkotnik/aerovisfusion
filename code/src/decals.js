/*
Drawing the delta wing in THREE.js

WING GEOMETRY

MISSING: wing geometry definition pipeline
The wing geometry was manually extracted from the grid data using ParaView. The wing data is in the vtk format because THREE.js supports a VTKLoader.




STREAMLINES

With statically drawn streamlines as the number of lines increases occlusion prevents the user from seeing the flow feature. The streamlets allow the features to be visible.

Maybe it's easier to just precompute streamlines and store that data to be used in the visualisation?

A Gaussian process regression model could be used to select some sampling points, e.g. 1000 of them, and these can be used as the seed points?

- convertpoints to lines
- check how many lines work smoothly
- update the line data on-the-go
- make the update on the GPU
- adapt for CFD data




The particle stepping approach works by finding the relevant velocity for each point the particle takes. For large grids this is slow. Octtrees can be used to reduce the search time, but still. This is similar to how streamlines are calculated in hte first place.

Another option is to precalculate hte lines, and then just move particles along those lines.




The CFD domain is essentially a box. The streamlines cannot intersect with the wing. So the particles only need to check whether they are within hte domain bounding box or not.

Other approach is the Octtree. this would be required for internal passages. No - not even there, the particles would never leave the domain anyway - they just follow the closest point. Provided that their velocity is low enough that they don't overshoot any nodes.

*/



import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import InterfaceDecals from "./GUI/InterfaceDecals.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

// The gui - statse need to be updated as animated.
var gui;


// Scene items
var camera, scene, light, renderer, controls;
var viewvec = new THREE.Vector3(0,0,-1);
const domainMidPoint = new THREE.Vector3(0.5, 100.5, 0);



// SETUP THE GEOMETRY AND INTERSECT ITEMS.
let mesh;
let raycaster;
let line;


// MOUSE INTERACTION HELPERS
let moved;
let selectedDecal;

const intersection = {
	intersects: false,
	point: new THREE.Vector3(),
	normal: new THREE.Vector3()
};
const mouse = new THREE.Vector2();
const intersects = []; // array that stores found intersects with mesh.



// Is the decal just an image? Can I draw it on the 2D canvas to manipulate it? In that case maybe the interaction can be 2 stage - oversize, and position within?

// Check first on-the-go interactions.


const textureLoader = new THREE.TextureLoader();
const decalDiffuse = textureLoader.load( 'assets/oil_flow_half.png' );
// const decalDiffuse = textureLoader.load( 'assets/decal-diffuse.png' );
// const decalNormal = textureLoader.load( 'assets/decal-normal.jpg' );

// normalMap: decalNormal,
const decalMaterial = new THREE.MeshPhongMaterial( {
	specular: 0x444444,
	map: decalDiffuse,
	normalScale: new THREE.Vector2( 1, 1 ),
	shininess: 30,
	transparent: true,
	depthTest: true,
	depthWrite: false,
	polygonOffset: true,
	polygonOffsetFactor: - 4,
	wireframe: false
} );


const decals = [];
let decalOrientationHelper;
const position = new THREE.Vector3();
const orientation = new THREE.Euler();
const size = new THREE.Vector3( 10, 10, 10 );


// Parameters from the UI - repackage into class?
const params = {
	minScale: 0.10,
	maxScale: 0.20,
	clear: function () {
		removeDecals();
	}
};






init();
animate();


function init() {


	// FOUNDATIONS
	setupScene();
	addOrbitControls();
	
	
	// GEOMETRY
	// Data domain viewframe.
	// The box is positioned by its centerpoint.
	/*
	const box = new THREE.BoxGeometry( 1.4, 1, 2 );
	const object = new THREE.Mesh( box, new THREE.MeshBasicMaterial( { color: 0x0FC3D6, wireframe: true } ) );
	object.position.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
	scene.add( object );
	*/
	
	// Add in the wing.
	addWingGeometry()
	
	
	
	// RAYCASTER
	addAimingRay();
	

	// mouse helper helps orinetate the decal onto the suface.
	decalOrientationHelper = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 10 ), new THREE.MeshNormalMaterial() );
	decalOrientationHelper.visible = false;
	scene.add( decalOrientationHelper );
	
	
	
	
	// Bringing this lookAt to the end fixed the camera misdirection initialisation.
	// With trackball controls lookAt no longer works.
	// console.log(scene, camera, object, viewvec)
	camera.lookAt( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
	console.log(camera)

	window.addEventListener( 'resize', onWindowResize );
	
	
	
	setupHUD();
	
	

} // init


// INTERACTIVITY

function addDecal() {

	// Position, Orientation, and Scale
	position.copy( intersection.point );
	
	orientation.copy( decalOrientationHelper.rotation ); // decalOrientationHelper!!!
	orientation.z = Math.random() * 2 * Math.PI;

	const scale = params.minScale + Math.random() * ( params.maxScale - params.minScale );
	size.set( scale, scale, scale ); // limit clipping box, or adjust puchDecalVertex!!!!



	// Make the decal object.
	const cutout = new DecalGeometry( mesh, position, orientation, size );

	const material = decalMaterial.clone();
	material.color.setHex( Math.random() * 0xffffff );
	
	const decal = new THREE.Mesh( cutout, material );
	
	
	// Add additional information required within the userData.
	decal.userData = {position, orientation, scale};
	
	decals.push( decal );
	scene.add( decal );
	
	
	console.log(decals)

} // addDecal

function removeDecals() {

	decals.forEach( function ( d ) {
		scene.remove( d );
	}); // forEach

	decals.length = 0;

}; // removeDecals

function transformDecal(decal){
	// Ok - try recalculating the decal geometry: seems to be working decently for this demo.
	// The input is an object that contains the decal object, as well as the new position, orientation, and scale.
	size.set(decal.userData.scale, decal.userData.scale, decal.userData.scale);
	
	const cutout = new DecalGeometry( mesh, decal.userData.position, decal.userData.orientation, size );
	decal.geometry.copy(cutout);
} // transformDecal




function checkIntersection( x, y, candidates) {
	// This should be adjusted so that the array of items to check the intersect against can be specified.

	if ( candidates.length < 1 ) return;

	mouse.x = ( x / window.innerWidth ) * 2 - 1;
	mouse.y = - ( y / window.innerHeight ) * 2 + 1;

	raycaster.setFromCamera( mouse, camera );
	raycaster.intersectObjects( candidates, false, intersects );

	
	if ( intersects.length > 0 ) {
		// Intersect point is the first point of the aimer line.
		const i = intersects[ 0 ];
		const p = i.point;
		
		// The normal gets transformed into the second point here.
		const n = intersects[ 0 ].face.normal.clone();
		n.multiplyScalar( 0.1 );
		n.add( intersects[ 0 ].point );
		
		
		// Set the aiming line vertices.
		const positions = line.geometry.attributes.position;
		positions.setXYZ( 0, p.x, p.y, p.z );
		positions.setXYZ( 1, n.x, n.y, n.z );
		positions.needsUpdate = true;


		// Intersection stores the intersect information for easier use later on.
		intersection.point.copy( p );
		intersection.normal.copy( intersects[ 0 ].face.normal );
		intersection.intersects = true;

		// Clear the intersects array.
		intersects.length = 0;
		
		
		// Reposition hte helper.
		decalOrientationHelper.position.copy( p );
		decalOrientationHelper.lookAt( n );
		
		return i
	} else {
		intersection.intersects = false;
	} // if
} // checkIntersection

function addBoundingBox(object){
	// This is a world oriented bounding box.
	const box = new THREE.BoxHelper(object, 0xffff00); 
	scene.add( box );
	
} // addBoundingBox


// SCENE.
function setupScene(){
	
		/* SCENE, CAMERA, and LIGHT setup.
	camera inputs: view angle, aspect ratio, near, far.
	desired domain to show = x: [0, 0.6], y: [100, 100.4], z: [0, 0.25].
	*/
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	camera.position.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z +1 );
	// camera.position.set( 0.16, 99, 0.95 );
	
	scene = new THREE.Scene();

	// With the normal material the light is not needed - but will be needed later.
	/*
	light = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.set( 1, 1, 1 ).normalize();
	scene.add( light );
	*/
	// The lighting has a major impact on the decals!!
	scene.add( new THREE.AmbientLight( 0xffffff ) );

	const dirLight1 = new THREE.DirectionalLight( 0xffffff, 1 );
	dirLight1.position.set( 1, 0.75, 0.5 );
	scene.add( dirLight1 );

	const dirLight2 = new THREE.DirectionalLight( 0xffffff, 1 );
	dirLight2.position.set( - 1, 0.75, - 0.5 );
	scene.add( dirLight2 );
	

	
	// SETUP THE ACTUAL LOOP
	// renderer.domElement is created in renderer.
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	// renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );
	
} // setupScene

function addWingGeometry(){
	const wingmaterial = new THREE.MeshBasicMaterial( { color: 0x0FC3D6 } );
	wingmaterial.side = THREE.DoubleSide;
	
	// Load the pressure surface. Encoding prescribed in Matlab. Float64 didn't render.
	let verticesPromise = fetch("./assets/deltawing/wing/vertices.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Float32Array(ab)}); // float32
	let indicesPromise = fetch("./assets/deltawing/wing/indices.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Uint32Array(ab)}); // uint32
	
	Promise.all([verticesPromise, indicesPromise]).then(a=>{
		
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.BufferAttribute( a[0], 3 ) );
		geometry.setIndex( new THREE.BufferAttribute(a[1], 1) );
		geometry.computeVertexNormals();
		
		mesh = new THREE.Mesh( geometry, wingmaterial );
		
		scene.add( mesh );
	}) // Promise.all
} // addWingGeometry

function addAimingRay(){
		
	// Create the raycaster.
	/*
	BEHAVIOR:
	- click and drag should support OrbitControls without pasting the decal.
	- so store moved as before, and only past on pointerup?
	*/
	
	// The line doesn't seem to work if it is not initialised near the surface. Why??
	const geometry = new THREE.BufferGeometry();
	geometry.setFromPoints( [ new THREE.Vector3(0.367, 100, 0.126), new THREE.Vector3(0.384, 100, 0.173) ] );
	line = new THREE.Line( geometry, new THREE.LineBasicMaterial() );
	scene.add( line );
	
	// The raycaster theat finds surface point.
	raycaster = new THREE.Raycaster();
	
	
	// Behavior. Change on CONTROLS, pointerdown, pointerup on window!
	controls.addEventListener( 'change', function (){
	  moved = true;
	}); // change


	// Selecting the decal using a longpress. After a longpress a decal should not be placed. Reusing the 'moved' variable from 'addAimingRay'.
	let pointerdownTime;
	let longPressTimer;
	window.addEventListener( 'pointerdown', function (event){
	  moved = false;
	  
	  pointerdownTime = performance.now();
	  longPressTimer = window.setTimeout(function(){ 
		if(!moved){
				
		  // How do we deselect a decal? Another longpress, or when another decal is selected.
		  let decalIntersection = checkIntersection( event.clientX, event.clientY, decals );
		  if ( decalIntersection ){
			highlightDecals( decalIntersection.object )
		  }; // if
		} // if	
	  },1000); 
	}); // pointerdown

	window.addEventListener( 'pointerup', function (event){
	  
	  // When a decal is deselected `selectedDecal' becomes undefined, and therefore a new decal is added here. How should this check if a new decal is needed or not? Check with the longpress timer somehow?
	  
	  clearTimeout(longPressTimer);
	  
	  let clickTime = performance.now() - pointerdownTime;
	  // It seems like 100ms is a usual click time for me, but 200ms is on the safe side.
	  if ( moved === false && clickTime < 200) {
		checkIntersection( event.clientX, event.clientY, mesh === undefined ? [] : [mesh] );
		if ( intersection.intersects ){
			addDecal();
		};
	  } // if
	}); // pointerup
	

	// For now just focus on adding the pointer helper.
	window.addEventListener( 'pointermove', function (event){
	  checkIntersection( event.clientX, event.clientY, mesh === undefined ? [] : [mesh] )
	}); // onPointerMove
	
	
	
	// Maybe we could highlight the wireframe instead of the emmissivity?
	function highlightDecals(d){
	
		
		decals.forEach(decal=>{
			decal.material.emissive.setHex(0x000000);
		}) // forEach
		
		
		let active = selectedDecal === d;
		d.material.emissive.setHex( active ? 0x000000 : 0xff0000);
		selectedDecal = active ? undefined : d;
				
		
	} // highlightDecals
	
	
	
	
	
} // addAimingRay







function setupHUD(){
	
	gui = new InterfaceDecals();
	document.body.appendChild( gui.node );
	
	
	/* What should the hud DO?
		for now try to see how on-the-go interactions would work: seems to be adequate.
		
		how could I select a decal to be adjusted? For annotations I can just click on them. Do I want to be able to put decals on-top of decals?
		
		
	*/
	
	
	gui.rotation.node.addEventListener("input", function(e){
	
		if(selectedDecal){
			selectedDecal.userData.orientation.z += gui.rotation.value / 360 * 2 * Math.PI;
			transformDecal( selectedDecal );
		} // if
	
	}) // rotation.addEventListener
	
	
	
	
	gui.size.node.addEventListener("input", function(e){
		/*
		The scaling applies to the entire decal, even to the parts that are not visible. If the decal part is skewed on the image itself then the scaling will visually offset the decal on the model.
		*/
		if(selectedDecal){			
			selectedDecal.userData.scale += gui.size.value/10;
			transformDecal( selectedDecal );
		} // if
	
	}) // rotation.addEventListener
	
	
	
	// The eraser is a toggle button, but in this demo it's required to erase single decals only - therefore it does not need to be toggled on/off.
	gui.eraser.node.onclick = function(){
		if(selectedDecal){
			scene.remove(selectedDecal);
			decals.splice( decals.indexOf(selectedDecal), 1);
		} // if
	} // onclick
	
	
	
} // setupHUD












// CONTROLS
function addOrbitControls(){
	controls = new OrbitControls( camera, renderer.domElement );
	controls.addEventListener( 'change', render );
	controls.target.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
} // addOrbitControls



function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	renderer.setSize( window.innerWidth, window.innerHeight );
} // onWindowResize


function animate() {
	requestAnimationFrame( animate );
	controls.update();
	gui.stats.update();
	render();
} // animate

function render() {	
	renderer.render( scene, camera );
} // render



