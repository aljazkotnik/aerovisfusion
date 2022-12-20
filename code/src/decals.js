import * as THREE from "three";
import { ArcballControls } from "./GUI/ArcballControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";


// Specifically for video rendering.
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

// Components.
import IframeVideo from "./components/IframeVideo.js";
import StaticImage from "./components/StaticImage.js";
import ContouredMesh from "./components/ContouredMesh.js";
import Decal from "./components/Decal.js";

import IsoSurface from "./components/IsoSurface.js";
// import IsoSurface from "./components/DummyIsoSurface.js";

import AnimatedStaticStreamlines from "./components/AnimatedStaticStreamlines.js";




// GUI
import SessionGUI from "./GUI/SessionGUI.js";
import ColorBar from "./GUI/ColorBar.js";

// Convenience helpers
import { trimStringToLength } from "./helpers.js";

/*
We want to draw a video into a scene. The challenges are: hosting a video, drawing it as a texture, and implementing hte necessary controls.

A video hosting platform already exists: YouTube.

Videos can be drawn to a canvas, which can then be drawn to a texture. Apparently the browser offers some controls anyway.

CSS3DRenderer allows an iFrame to be rendered as a texture, which allows the use of native YouTube controls.
*/




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


// Scene items
var camera, arcballcontrols, transformcontrols;
var sceneWebGL, rendererWebGL;
var sceneCSS, rendererCSS;


// Colorbar
const color = new THREE.Color();
const colorbar = new ColorBar(0.23, 0.78);
colorbar.colormap = "d3Spectral";


// Decals.
const decalGeometries = []; // Geometries that can have a decal added on them.



// Make the overall GUI for elements.
var gui
var allTransformControllers = [];
var elementsThatNeedToBeUpdated = [];







init();
animate();

function init() {

	setupScene();
	setupHUD();
	addArcballControls();
	addTransformControls();
	
	
	
	const task = "./assets/deltawing/" + "mach_0p5_re_1e5_aoa_15_sweep_60_2500steps";
	
	// For development
	addWingGeometry( task + '/wing/config.json');
	addDecal('assets/20220125_143807_gray.jpg');

	window.addEventListener( 'resize', onWindowResize );
	
} // init



function setupScene(){
	
	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	
	// SCENES
	sceneWebGL = new THREE.Scene();
	sceneCSS = new THREE.Scene();
	
	sceneWebGL.name = "sceneWebGL";
	sceneCSS.name = "sceneCSS";
	
	// LIGHTS - ambient light shows everything, but does not allow for shadows to be cast.
	var ambientLight = new THREE.AmbientLight( 0xaaaaaa );
	sceneWebGL.add( ambientLight );


	// Position lights to cast shadows around hte scene.
	const light1 = new THREE.PointLight( 0xffffff, 0.2 );
	const light2 = new THREE.PointLight( 0xffffff, 0.2 );
	const light3 = new THREE.PointLight( 0xffffff, 0.2 );
	const light4 = new THREE.PointLight( 0xffffff, 0.2 );
	const light5 = new THREE.PointLight( 0xffffff, 0.2 );
	const light6 = new THREE.PointLight( 0xffffff, 0.2 );

	let xMid = domainMidPoint.x;
	let yMid = domainMidPoint.y;
	let zMid = domainMidPoint.z;

	// These are different lights for different faces.
	light1.position.set( xMid, yMid, zMid + 2 );
	light2.position.set( xMid, yMid, zMid - 2 );
	light3.position.set( xMid + 2, yMid, zMid  );
	light4.position.set( xMid - 2, yMid, zMid );
	light5.position.set( xMid, yMid + 2, zMid  );
	light6.position.set( xMid, yMid - 2, zMid );


	sceneWebGL.add(light1)
	sceneWebGL.add(light2)
	sceneWebGL.add(light3)
	sceneWebGL.add(light4)
	sceneWebGL.add(light5)
	sceneWebGL.add(light6)
	
	/*
	const lightHelper1 = new THREE.PointLightHelper(light1, 0.01);
	const lightHelper2 = new THREE.PointLightHelper(light2, 0.01);
	const lightHelper3 = new THREE.PointLightHelper(light3, 0.01);
	const lightHelper4 = new THREE.PointLightHelper(light4, 0.01);
	const lightHelper5 = new THREE.PointLightHelper(light5, 0.01);
	const lightHelper6 = new THREE.PointLightHelper(light6, 0.01);
	
	sceneWebGL.add( lightHelper1 );
	sceneWebGL.add( lightHelper2 );
	sceneWebGL.add( lightHelper3 );
	sceneWebGL.add( lightHelper4 );
	sceneWebGL.add( lightHelper5 );
	sceneWebGL.add( lightHelper6 );
	*/
	

	
	// RENDERERS - css for video, webgl for CFD geometry
	rendererCSS = new CSS3DRenderer();
    rendererCSS.setSize( window.innerWidth, window.innerHeight );
    rendererCSS.domElement.style.position = 'absolute';
    rendererCSS.domElement.style.top = 0;
	rendererCSS.domElement.style.zIndex = 0;
	rendererCSS.name = "rendererCSS";
    
    rendererWebGL = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rendererWebGL.setClearColor( 0x000000, 1 );
    rendererWebGL.setPixelRatio( window.devicePixelRatio );
    rendererWebGL.setSize( window.innerWidth, window.innerHeight );
    rendererWebGL.shadowMap.enabled = true;
    rendererWebGL.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
	rendererWebGL.domElement.style.zIndex = 1;
    rendererWebGL.name = "rendererWebGL";
	
	
	// APPEND RENDERES
	document.getElementById( 'css' ).appendChild( rendererCSS.domElement );
	document.getElementById('webgl').appendChild( rendererWebGL.domElement );
	

	
} // setupScene






// SCENE ELEMENTS:
function addWingGeometry(configFilename){
	
	
	
	const m = new ContouredMesh( configFilename, colorbar.uniforms );
	
	
	m.addTo( sceneWebGL );
	m.addGUI( gui.elements )
	
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

function addDecal( decalImageFilename ){
	
	// DECAL: make the asset url an input.
	const decalobj = new Decal( decalImageFilename, camera, decalGeometries );
	decalobj.addTo( sceneWebGL )
	decalobj.addGUI( gui.elements );
	
	// And append the nodal to the session.
	document.body.appendChild( decalobj.editor.node );
	
	
	// Disable the pointer long press events if the user is navigating the domain.
	arcballcontrols.addEventListener( 'change', function (){
	   decalobj.raypointer.enabled = false;
	}); // change
	
} // addDecal



// HUD
function setupHUD(){
	
	const elementOptions = {
		"Geometry": function(filename){ addWingGeometry(filename) },
		"Video": function(filename){ addYoutubeVideo(filename, 1, 0.8, 100, 0, 0, Math.PI/2, Math.PI/2) },
		"Image": function(filename){ addStaticImage(filename, 1, 0.4, 100, 0, Math.PI/2, 0, 0) },
	}
	
	// Camera is required to update the annotation glow correctly.
	gui = new SessionGUI( elementOptions, rendererCSS, sceneWebGL, camera );
	document.body.appendChild( gui.dom );
	
	
	// The glow of the annotations needs to be updated.
	elementsThatNeedToBeUpdated.push( gui )
	
	
	
	
	// Append the colorbar somewhere.
	// gui.dom.querySelector("div.righttop").appendChild( colorbar.canvas )
	
	
	
	
	
	// Allow selected 3D annotations to be repositioned using transform controls.
	const tc = gui.annotations.controllers.find(c=>c.property=="position");
	allTransformControllers.push(tc);
	gui.volumetags.changeTransformObject = function(v){
		let current = gui.volumetags.annotations.selected[0];
		v = current ? v : false;
		switchTransformObject( v, tc, current, function(){gui.volumetags.annotations.ontransform()} );
	} // changeTransformObject

} // setupHUD



// CONTROLS - ADDED TO CSS RENDERER!!!!
function addArcballControls(){
	
	arcballcontrols = new ArcballControls( camera, rendererCSS.domElement, sceneWebGL );
	arcballcontrols.focus( focusInitialPoint, 1, 1 );
	
	// Adding hte controls, and changing the focus will both change the position of hte camera. When manually repositioning the camera, the controls need to be updated.
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	arcballcontrols.update();

	console.log(setGizmoOpacity)
	// console.log(arcballcontrols, getVista, moveToVista)
	
} // addArcballControls


// CONVENIENCE FUNCTIONS
function setGizmoOpacity(active){
	arcballcontrols._gizmos.children.forEach(function(gizmoLine){
		gizmoLine.material.setValues( { opacity: 1*active } );
	}) // forEach
} // setGizmoOpacity


// These two work, just some easing still needs to be applied, and the vista should be stored in the database!
function moveToVista(af, cp){
	// Set the arcballcontrols focus to `af', and move the camera to the relevant position 'cp'.
	arcballcontrols.focus( af.point, af.size, af.amount );
	camera.position.set( cp.x, cp.y, cp.z );
	arcballcontrols.update();
} // moveToVista

function getVista(){
	return [arcballcontrols.retrieveCurrentFocus(), camera.position.clone()]
} // getVista





function addTransformControls(){
	// Attach and detach can be used to control the appearance of controls.
	transformcontrols = new TransformControls( camera, rendererCSS.domElement );
	transformcontrols.addEventListener( 'dragging-changed', function ( event ){
		arcballcontrols.enabled = ! event.value;
	});
	sceneWebGL.add( transformcontrols );
	
	
	// Add in the possibility to switch between control modes.
	window.addEventListener( 'keydown', function ( event ) {

		switch ( event.keyCode ) {

			case 81: // Q
				transformcontrols.setSpace( transformcontrols.space === 'local' ? 'world' : 'local' );
				break;

			case 16: // Shift
				transformcontrols.setTranslationSnap( 100 );
				transformcontrols.setRotationSnap( THREE.MathUtils.degToRad( 15 ) );
				transformcontrols.setScaleSnap( 0.25 );
				break;

			case 87: // W
				transformcontrols.setMode( 'translate' );
				break;

			case 69: // E
				transformcontrols.setMode( 'rotate' );
				break;

			case 82: // R
				transformcontrols.setMode( 'scale' );
				break;

			case 187:
			case 107: // +, =, num+
				transformcontrols.setSize( transformcontrols.size + 0.1 );
				break;

			case 189:
			case 109: // -, _, num-
				transformcontrols.setSize( Math.max( transformcontrols.size - 0.1, 0.1 ) );
				break;

			case 88: // X
				transformcontrols.showX = ! transformcontrols.showX;
				break;

			case 89: // Y
				transformcontrols.showY = ! transformcontrols.showY;
				break;

			case 90: // Z
				transformcontrols.showZ = ! transformcontrols.showZ;
				break;

			case 32: // Spacebar
				transformcontrols.enabled = ! transformcontrols.enabled;
				break;

			case 27: // Esc
				transformcontrols.reset();
				break;

		}

	} );
} // addTransformControls

function switchTransformObject( v, controller, object, ontransform ){
	// Only evaluates if controller is set to true. Therefore switch all others off - this shouldn't trigger another switch because of if statements in individual onChange funtions.
	
	// If the value is false, then nothing should happen, unless the same object is currently being used by the transform controls.
	if(v){ 
	
		let switchOff = allTransformControllers.filter(tc=>tc).filter(tc=>tc!=controller)
		switchOff.forEach(tc=>tc.setValue(false))
		
		
		transformcontrols.attach( object );
		if( ontransform ){ transformcontrols.addEventListener( 'change', ontransform ); } // if
		
	} else if( transformcontrols.object == object ){
		// Check if the transform should be detached.
		transformcontrols.detach();
	} // if
	
	
	// At the end check if the informations hould be displayed.
	document.getElementById("info").style.display = allTransformControllers.some(tc=>tc.getValue()) ? "block" : "none";
	
	
} // switchTransformObject



function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	rendererWebGL.setSize( window.innerWidth, window.innerHeight );
	rendererCSS.setSize( window.innerWidth, window.innerHeight );
	
} // onWindowResize

function animate() {
	requestAnimationFrame( animate );
	elementsThatNeedToBeUpdated.forEach(el=>el.update());
	render();
} // animate

function render(){
	
	rendererWebGL.render(sceneWebGL, camera);
	rendererCSS.render(sceneCSS, camera );
	
} // render