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
import ColorBar from "./GUI/ColorBar.js";
import ContouredMesh from "./components/ContouredMesh.js";
import Decal from "./components/Decal.js";


// Debugging
import { VertexNormalsHelper } from "three/examples/jsm/helpers/VertexNormalsHelper.js";

// GUI
import { html2element } from "./helpers.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "stats.js";





// Scene items
var camera, arcballcontrols, transformcontrols;
var sceneWebGL, rendererWebGL;


// GUI items
var elementsGUI;
var stats;


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
	
	console.log(arcballcontrols)
	
	// Add in the wing.
	addWingGeometry()
	
	
	// Add in a decal
	addDecal();
	

	window.addEventListener( 'resize', onWindowResize );
	console.log(sceneWebGL)

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
    rendererWebGL.setClearColor( 0xFFFFFF, 0 );
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
	
	// DECAL: make the asset url an input.
	const decalobj = new Decal( 'assets/20220125_143807_gray.jpg', camera, decalGeometries );
	decalobj.addTo( sceneWebGL )
	
	
	// Disable the pointer long press events if the user is navigating the domain.
	arcballcontrols.addEventListener( 'change', function (){
	   decalobj.raypointer.enabled = false;
	}); // change
	
	
	// Add teh decal gui to the overall gui.
	decalobj.addGUI(elementsGUI);
	
	
	// And append the nodal to the session.
	document.body.appendChild( decalobj.editor.node );
	
} // addDecal






// GEOMETRY
function addWingGeometry(){
	
	
	const m = new ContouredMesh( "./assets/deltawing/wing/config_deltawing.json", colorbar.uniforms );
	
	
	m.addTo( sceneWebGL );
	m.addGUI( elementsGUI )
	
	m.dataPromise.then(mesh=>{
		
		// To allow decals to be placed on it.
		decalGeometries.push( mesh );
		
		// Subscribe the mesh material to the colorbar for future changes.
		colorbar.subscribers.push([m, function(){
			m.dataPromise.then(mesh=>{
				mesh.material.uniforms.u_colorbar.value.needsUpdate = true;
			})
		}]);
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
	
	
	// MAYBE THIS GUI SHOULD BE WRAPPED UP?
	const gui = new GUI({
		container: container.querySelector("div.controls"),
		title: "Session controls"
	});
	elementsGUI = gui.addFolder("Elements");
	const addElementGUI = gui.addFolder("Add element");
	var allTransformControllers = [];

	// The button should open a modal, or append a selection to the GUI to configure the element to be added.
	const addElementConfig = {
		type: '',
		name: 'type in asset address',
		add: function(el){
			// Evaluate the current config and clear it.
			
			switch( addElementConfig.type ){
				case "Image":
					// addStaticImage( './assets/schlieren_mon_15p_0s_flat_side_flipped.jpg', 1, 0.4, 100, 0, Math.PI/2, 0, 0);
					break;
				case "Video":
					// addYoutubeVideo( 'JWOH6wC0uTU', 1, 0.8, 100, 0, 0, Math.PI/2, Math.PI/2 );
					break;
				case "Geometry":
					// addWingGeometry();
					break;
				case "Decal":
					addDecal();
				default:
			}; // switch
		}
	}


	addElementGUI.add( addElementConfig, "type", ['','Image','Video','Geometry','Decal'] ) // dropdown
	addElementGUI.add( addElementConfig, "name" ); 	// text field
	addElementGUI.add( addElementConfig, "add" ); 	// button
	
	
} // setupHUD












// CONTROLS
function addArcballControls(){
	
	arcballcontrols = new ArcballControls( camera, document.getElementById( 'css' ), sceneWebGL );
	arcballcontrols.focus( focusInitialPoint, 1, 1 );
	arcballcontrols.activateGizmos(false);
	
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



