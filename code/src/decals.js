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



// THREE basics
import * as THREE from "three";
import { ArcballControls } from "three/examples/jsm/controls/ArcballControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";


// Scene elements
import InterfaceDecals from "./GUI/InterfaceDecals.js";
import ColorBar from "./GUI/ColorBar.js";
import ContouredMesh from "./components/ContouredMesh.js";
import Decal from "./components/Decal.js";


// Debugging
import { VertexNormalsHelper } from "three/examples/jsm/helpers/VertexNormalsHelper.js";

// GUI
import { html2element } from "./helpers.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "stats.js";


var stats;


// Scene items
var camera, arcballcontrols;
var sceneWebGL, rendererWebGL;
var gui;


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




// Some helpers for decals.
const decalGeometries = []; // Geometries that can have a decal added on them.






init();
animate();


function init() {


	// FOUNDATIONS
	setupScene();
	addArcballControls();
	setupHUD();
	
	
	
	// Add in the wing.
	addWingGeometry()
	
	
	// Add in a decal
	addDecal();
	
	

	window.addEventListener( 'resize', onWindowResize );
	

} // init


// SCENE.
function setupScene(){
	
	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	
	// SCENES
	sceneWebGL = new THREE.Scene();
	sceneWebGL.name = "sceneWebGL";
	
	
	// LIGHTS - ambient light seems to be sufficient.
	var ambientLight = new THREE.AmbientLight( 0xaaaaaa );
	sceneWebGL.add( ambientLight );

	
	
    // RENDERERS
    rendererWebGL = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rendererWebGL.setClearColor( 0x000000, 0 );
    rendererWebGL.setPixelRatio( window.devicePixelRatio );
    rendererWebGL.setSize( window.innerWidth, window.innerHeight );
    rendererWebGL.shadowMap.enabled = true;
    rendererWebGL.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
	rendererWebGL.domElement.style.zIndex = 1;
    rendererWebGL.name = "rendererWebGL";
	
	
	// APPEND RENDERES
	document.getElementById('webgl').appendChild( rendererWebGL.domElement );
	
} // setupScene





// DECALS
// There should be a single add decal function that takes in the image URL, and takes care of everything else.
function addDecal(){
	
	// RAYCASTER
	// addAimingRay();
	const oilFlowDecal = new Decal( camera, decalGeometries );
	oilFlowDecal.addTo( sceneWebGL )
	
	
	// Disable the pointer long press events if the user is navigating the domain.
	arcballcontrols.addEventListener( 'change', function (){
	   oilFlowDecal.raypointer.enabled = false;
	}); // change
	
	
	// Add teh decal gui to the overall gui.
	oilFlowDecal.addGUI(gui);
	
	// And append the nodal to the session.
	document.body.appendChild( oilFlowDecal.editor.node );
	
} // addDecal






// GEOMETRY
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
		sceneWebGL.add( mesh );
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
	
	
		// var vnh = new VertexNormalsHelper( mesh, 1, 0xff0000 );
		// scene.add( vnh );
		// console.log(mesh)
	}) // then
	
	
} // addWingGeometry











function setupHUD(){
	
	let template = `
	<div style="position: fixed;">
	  <div class="stats"></div>
	  <div class="controls" style="position: fixed; top: 10px; float: right; right: 10px;"></div>
	</div>
	`;
	
	const container = html2element(template);
	document.body.appendChild( container );
	
	// Add the Stats object.
	stats = new Stats();
	stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
	container.querySelector("div.stats").appendChild( stats.dom );
	
	// The decal GUI is appended into a separate container, as it is a modal. But the controls need to have a button that toggles the modal on/off.
	
	// Lets see if I can make a gui, and then append a whole new GUI to it.
	gui = new GUI({
		container: container.querySelector("div.controls"),
		title: "Overall GUI"
	});
	
	

	/*
	gui = new InterfaceDecals();
	document.body.appendChild( gui.node );
	
	
	// What should the hud DO?
	//	for now try to see how on-the-go interactions would work: seems to be adequate.
		
	//	how could I select a decal to be adjusted? For annotations I can just click on them. //	 Do I want to be able to put decals on-top of decals?
	
	
	gui.rotation.node.addEventListener("input", function(e){
	
		if(selectedDecal){
			selectedDecal.orientation.z += gui.rotation.value / 360 * 2 * Math.PI;
			selectedDecal.transform();
		} // if
	
	}) // rotation.addEventListener
	
	
	
	
	gui.size.node.addEventListener("input", function(e){
		// The scaling applies to the entire decal, even to the parts that are not visible. If the decal part is skewed on the image itself then the scaling will visually offset the decal on the model.
		if(selectedDecal){			
			selectedDecal.scale += gui.size.value/10;
			selectedDecal.transform();
		} // if
	
	}) // rotation.addEventListener
	
	
	
	// The eraser is a toggle button, but in this demo it's required to erase single decals only - therefore it does not need to be toggled on/off.
	gui.eraser.node.onclick = function(){
		if(selectedDecal){
			sceneWebGL.remove(selectedDecal.mesh);
			decals.splice( decals.indexOf(selectedDecal), 1);
		} // if
	} // onclick
	*/
	
	
} // setupHUD












// CONTROLS
function addArcballControls(){
	
	arcballcontrols = new ArcballControls( camera, document.getElementById( 'css' ), sceneWebGL );
	arcballcontrols.focus( focusInitialPoint, 1, 1 );
	
	
	// Adding hte controls, and changing the focus will both change the position of hte camera. When manually repositioning the camera, the controls need to be updated.
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	arcballcontrols.update();

} // addArcballControls





function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	rendererWebGL.setSize( window.innerWidth, window.innerHeight );
} // onWindowResize

function animate() {
	requestAnimationFrame( animate );
	stats.update();
	render();
} // animate

function render() {	
	rendererWebGL.render( sceneWebGL, camera );
} // render



