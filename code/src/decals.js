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
import { ArcballControls } from "three/examples/jsm/controls/ArcballControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";


import InterfaceDecals from "./GUI/InterfaceDecals.js";
import ColorBar from "./GUI/ColorBar.js";
import ContouredMesh from "./components/ContouredMesh.js";
import PointerRay from "./components/PointerRay.js";
import Decal from "./components/Decal.js";


// The gui - statse need to be updated as animated.
var gui;


// Scene items
var camera, scene, light, renderer, controls;
var viewvec = new THREE.Vector3(0,0,-1);


/*
wing domain roughly = {
	x = [0, 0.7]
	y = [100.1, 100.4]
	z = [0, 0.3]
}
*/
const domainMidPoint = new THREE.Vector3(0.4, 100.5, 0);
const focusInitialPoint = new THREE.Vector3(0.345, 100.166, 0.127);
const cameraInitialPoint = new THREE.Vector3(focusInitialPoint.x, focusInitialPoint.y, focusInitialPoint.z + 1);



// Colorbar
const color = new THREE.Color();
const colorbar = new ColorBar(0.14, 0.44);
colorbar.colormap = "d3Spectral";


// SETUP THE GEOMETRY AND INTERSECT ITEMS.
var raypointer;


// DECAL HELPERS
const decalOrientationHelper = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 10 ), 
                                               new THREE.MeshNormalMaterial() );
decalOrientationHelper.visible = false;
	
const decals = []; // different Decal instances
const decalGeometries = []; // Geometries that can have a decal added on them.
let selectedDecal;



// Is the decal just an image? Can I draw it on the 2D canvas to manipulate it? In that case maybe the interaction can be 2 stage - oversize, and position within?

// Check first on-the-go interactions.



// Parameters from the UI - repackage into class?
const params = {
	minScale: 0.10,
	maxScale: 0.20,
	clear: function () {
		removeDecals();
	}
};




// Decal is added through the GUI.
const oilFlowDecal = new Decal();
decals.push( oilFlowDecal )


init();
animate();


function init() {


	// FOUNDATIONS
	setupScene();
	addArcballControls();
	
	
	
	
	// Add in the wing.
	addWingGeometry()
	
	
	
	// RAYCASTER
	addAimingRay();
	

	// mouse helper helps orinetate the decal onto the suface.
	scene.add( decalOrientationHelper );
	
	// Add the decal mesh to the scene.
	scene.add( oilFlowDecal.mesh );
	
	
	

	window.addEventListener( 'resize', onWindowResize );
	
	
	
	setupHUD();
	
	

} // init


// INTERACTIVITY
function positionDecal(target) {
	
	// Reposition the orientation helper. Or maybe this can be done in addDecal?
	decalOrientationHelper.position.copy( raypointer.getLinePoint(0) );
	decalOrientationHelper.lookAt( raypointer.getLinePoint(1) );
	
	decalOrientationHelper.rotation.z = Math.random() * 2 * Math.PI;
	
	oilFlowDecal.support = target.object;
	oilFlowDecal.position.copy( decalOrientationHelper.position )
	oilFlowDecal.orientation.copy( decalOrientationHelper.rotation )
	oilFlowDecal.scale = params.minScale + Math.random() * ( params.maxScale - params.minScale );
	
	oilFlowDecal.transform()
	
	
	
	/*
	// The GUI has various decals as elements, and the user must select the on ethat is currently active. Here, the currently active one is selected to be positioned.
	
	for(let i=0; i<decals.length; i++){
		if(decals[i].active){
			decals[i].pasteOn(target);
		} // if
	} // for
	*/

} // positionDecal

function removeDecals() {

	decals.forEach( function ( d ) {
		scene.remove( d.mesh );
	}); // forEach

	decals.length = 0;

}; // removeDecals




function addAimingRay(){
		
	// Create the raycaster.
	/*
	BEHAVIOR:
	- click and drag should support OrbitControls without pasting the decal.
	- so store moved as before, and only past on pointerup?
	*/
	
	raypointer = new PointerRay( camera );
	scene.add( raypointer.line )
	
	// Disable the pointer long press events if the user is navigating the domain.
	controls.addEventListener( 'change', function (){
	   raypointer.enabled = false;
	}); // change
	
	console.log(raypointer)
	
	raypointer.pointerdown = function(event){
		// How do we deselect a decal? Another longpress, or when another decal is selected.
		let decalMeshes = decals.map(d=>d.mesh);
		let target = raypointer.checkIntersection( event.clientX, event.clientY, decalMeshes );
		let targetDecal = decals[decalMeshes.indexOf(target.object)];
		
		if ( target ){
			decals.forEach(decal=>{
				decal.mesh.material.color.setHex(0xffffff);
			}) // forEach
			
			// If target object is the current selected decal, then it should be turned off.
			let active = selectedDecal ? selectedDecal.mesh === target.object : false;
			target.object.material.color.setHex( active ? 0xffffff : 0xff00ff);
			selectedDecal = active ? undefined : targetDecal;
		}; // if
	} // pointerdown
	
	raypointer.pointerup = function(event){
		let target = raypointer.checkIntersection( event.clientX, event.clientY, decalGeometries );
		if ( target ){
			positionDecal( target );
		}; // if
	} // pointerup
	
	raypointer.pointermove = function(event){
		raypointer.checkIntersection( event.clientX, event.clientY, decalGeometries );
	} // pointermove
	
	
} // addAimingRay










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

function adjustView(position){
	// Is it the controls target that sets the view??
	controls.enabled = false;

	camera.position.set( position[0], position[1], position[2] );
	camera.lookAt( controls.target );

	controls.enabled = true;
} // adjustView


function addWingGeometry(){
	
	
	
	// Load the pressure surface. Encoding prescribed in Matlab. Float64 didn't render.
	let verticesPromise = fetch("./assets/deltawing/wing/vertices.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Float32Array(ab)}); // float32
	let indicesPromise = fetch("./assets/deltawing/wing/indices.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Uint32Array(ab)}); // uint32
	let valuePromise = fetch("./assets/deltawing/wing/mach.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Float32Array(ab)}); // float32
	  
	  
	const dataPromise = Promise.all([verticesPromise, indicesPromise, valuePromise]);
	  

	const m = new ContouredMesh( "deltawing", dataPromise, colorbar.uniforms );
	
	m.created.then(mesh=>{
		mesh.name = "Delta wing";
		scene.add( mesh );
		decalGeometries.push( mesh );
		
		// Subscribe the mesh material to the colorbar for future changes.
		function updateMeshColorbarTexture(mesh){
			/* Uniforms controlled by the colorbar GUI:
			obj.uniforms = {
				u_colorbar: { type: "t", value: new CanvasTexture( canvas ) },
				u_thresholds: {value: initialThresholds },
				u_n_thresholds: {value: obj.n },
				u_isolines_flag: {value: false },
				u_contours_flag: {value: true }
			};
			*/
			mesh.material.uniforms.u_colorbar.value.needsUpdate = true;
		} // updateMeshColorbarTexture
		colorbar.subscribers.push([mesh, updateMeshColorbarTexture]);
		
		
		/*
		// Add GUI controllers.
		const guiconfig = m.config;
		const folder = elementsGUI.addFolder( "Geometry: " + trimStringToLength(guiconfig.name , 27) );
		
		folder.add( guiconfig, "visible" ); 	   // boolean
		
		
		guiconfig.remove = function(){
			folder.destroy();
			sceneWebGL.remove( mesh );
		} // remove
		folder.add( guiconfig, "remove" );      // button
		*/
	
		
	}) // then
	
	
} // addWingGeometry











function setupHUD(){
	
	gui = new InterfaceDecals();
	document.body.appendChild( gui.node );
	
	
	/* What should the hud DO?
		for now try to see how on-the-go interactions would work: seems to be adequate.
		
		how could I select a decal to be adjusted? For annotations I can just click on them. Do I want to be able to put decals on-top of decals?
		
		
	*/
	
	
	gui.rotation.node.addEventListener("input", function(e){
	
		if(selectedDecal){
			selectedDecal.orientation.z += gui.rotation.value / 360 * 2 * Math.PI;
			selectedDecal.transform();
		} // if
	
	}) // rotation.addEventListener
	
	
	
	
	gui.size.node.addEventListener("input", function(e){
		/*
		The scaling applies to the entire decal, even to the parts that are not visible. If the decal part is skewed on the image itself then the scaling will visually offset the decal on the model.
		*/
		if(selectedDecal){			
			selectedDecal.scale += gui.size.value/10;
			selectedDecal.transform();
		} // if
	
	}) // rotation.addEventListener
	
	
	
	// The eraser is a toggle button, but in this demo it's required to erase single decals only - therefore it does not need to be toggled on/off.
	gui.eraser.node.onclick = function(){
		if(selectedDecal){
			scene.remove(selectedDecal.mesh);
			decals.splice( decals.indexOf(selectedDecal), 1);
		} // if
	} // onclick
	
	
	
} // setupHUD












// CONTROLS
function addArcballControls(){
	
	controls = new ArcballControls( camera, renderer.domElement, scene );
	controls.focus( focusInitialPoint, 1, 1 );
	
	
	// Adding hte controls, and changing the focus will both change the position of hte camera. When manually repositioning the camera, the controls need to be updated.
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	controls.update();
	
	
	
	
	
} // addArcballControls


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



