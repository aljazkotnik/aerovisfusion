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


// Import some components.
import ContouredMesh from "./components/ContouredMesh.js";
import IsoSurface from "./components/IsoSurface.js";
import {text2csv, csvStreamline2jsonStreamline} from "./helpers.js";

import ColorBar from "./GUI/ColorBar.js";





// Scene items
var camera, controls;
var sceneWebGL, rendererWebGL;


const color = new THREE.Color();
const colorbar = new ColorBar(0.14, 0.44);
colorbar.colormap = "d3Spectral";


const domainMidPoint = new THREE.Vector3(0.4, 100.5, 0);
const focusInitialPoint = new THREE.Vector3(0.345, 100.166, 0.127);
const cameraInitialPoint = new THREE.Vector3(focusInitialPoint.x, focusInitialPoint.y, focusInitialPoint.z + 1);



init();
animate();


function init() {

	setupScene();
	
	// Add the controls
	addArcballControls();
	
	// Add in the wing.
	addWingGeometry()
	
	// Add in the iso surface.
	let io = addIsoSurface();
	document.getElementById("GUI").appendChild(io.thresholdInput);
	
	
	// Bringing this lookAt to the end fixed the camera misdirection initialisation.
	// With trackball controls lookAt no longer works.
	// adjustView([0.43, 99, 1.2])
	console.log(camera, sceneWebGL, colorbar, controls);

	window.addEventListener( 'resize', onWindowResize );
} // init



function setupScene(){
	
	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	
	// SCENES
	sceneWebGL = new THREE.Scene();
	
	
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
    
	
	// APPEND RENDERES
	document.body.appendChild( rendererWebGL.domElement );
	

	
} // setupScene

function adjustView(position){
	// Is it the controls target that sets the view??
	controls.enabled = false;

	camera.position.set( position[0], position[1], position[2] );
	camera.lookAt( controls.target );

	controls.enabled = true;
} // adjustView


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
	  

	const m = new ContouredMesh( dataPromise, colorbar.uniforms );
	
	m.created.then(mesh=>{
		mesh.name = "Delta wing";
		sceneWebGL.add( mesh );
		
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
		colorbar.subscribers.push([mesh, updateMeshColorbarTexture])
	})
	
	
} // addWingGeometry


function addIsoSurface(){
	
	// Maybe this data should be specified outside? Leave here for now.
	const path = "./assets/deltawing/block/";
	const c = fetch( path + "suction_side_block_connectivity.json").then(res=>res.json());
	const v = fetch( path + "suction_side_block_vertices.json").then(res=>res.json());
	const m = fetch( path + "suction_side_block_mach.json").then(res=>res.json());
	
	const loadDataPromise = Promise.all([ c,v,m ]).then( data=>{
		
		let mach = data[2];
		mach.domain = [Math.min.apply( null, mach ), Math.max.apply( null, mach )];
	
		return {
			connectivity: data[0],
			vertices: data[1],
			mach: mach
		};
	}) // Promise.all
	
	
	// Iso Surface is different to the wing because the user can interact with it.
	const isoobj = new IsoSurface(loadDataPromise);
	
	isoobj.data.then(function(d){
		isoobj.mesh.name = "iso-surface";
		sceneWebGL.add( isoobj.mesh );
	})


	return isoobj
	
	
} // addWingGeometry





// Make the colormap.






// CONTROLS
function addArcballControls(){
	
	controls = new ArcballControls( camera, rendererWebGL.domElement, sceneWebGL );
	controls.focus( focusInitialPoint, 1, 1 );
	
	
	// Adding hte controls, and changing the focus will both change the position of hte camera. When manually repositioning the camera, the controls need to be updated.
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	controls.update();
	
} // addArcballControls



function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	rendererWebGL.setSize( window.innerWidth, window.innerHeight );
} // onWindowResize


function animate() {
	requestAnimationFrame( animate );
	render();
} // animate

function render() {	
	rendererWebGL.render( sceneWebGL, camera );
} // render




