import * as THREE from "three";
import { ArcballControls } from "three/examples/jsm/controls/ArcballControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";


// Specifically for video rendering.
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

// Components.
import IframeVideo from "./components/IframeVideo.js";
import StaticImage from "./components/StaticImage.js";
import ContouredMesh from "./components/ContouredMesh.js";
import Decal from "./components/Decal.js";
import IsoSurface from "./components/IsoSurface.js";
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
const colorbar = new ColorBar(0.14, 0.44);
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
	
	
	
	// For development
	addWingGeometry('./assets/deltawing/wing/config_deltawing.json');
	// addStaticImage( './assets/schlieren_mon_15p_0s_flat_side_flipped.jpg', 1, 0.4, 100, 0, Math.PI/2, 0, 0);
	// addYoutubeVideo( 'JWOH6wC0uTU', 1, 0.8, 100, 0, 0, Math.PI/2, Math.PI/2 );
	// addDecal('assets/20220125_143807_gray.jpg');
	// addIsoSurface('./assets/deltawing/block/config_isosurface.json');
	// addAnimatedStreamlines('./assets/deltawing/streamlines/streamlines_suction_side_min.json');

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
	
	// LIGHTS - ambient light seems to be sufficient.
	var ambientLight = new THREE.AmbientLight( 0xaaaaaa );
	sceneWebGL.add( ambientLight );

	
	// RENDERERS - css for video, webgl for CFD geometry
	rendererCSS = new CSS3DRenderer();
    rendererCSS.setSize( window.innerWidth, window.innerHeight );
    rendererCSS.domElement.style.position = 'absolute';
    rendererCSS.domElement.style.top = 0;
	rendererCSS.domElement.style.zIndex = 0;
	rendererCSS.name = "rendererCSS";
    
    rendererWebGL = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rendererWebGL.setClearColor( 0x000000, 0 );
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

function addYoutubeVideo(id, w, x, y, z, rx, ry, rz){
	// By default the video is oriented witth the width along the x axis and height along the y axis.
	// Therefore it needs to first be rotated around the z axis by -90degrees, and then along the y axis for 90 degrees.

	
	let iv = new IframeVideo( id, w, x, y, z, rx, ry, rz );
	
	iv.addTo( sceneCSS, sceneWebGL );
	iv.addGUI( gui.elements );
	
	
	const tc = iv.gui.controllers.find(c=>c.property=="positioning");
	allTransformControllers.push(tc);
	tc.onChange(function(v){
		// If the value is false, then nothing should happen.
		switchTransformObject( v, tc, iv.cssItem, function(){ iv.ontransform() }) 
	});

} // addYoutubeVideo

function addStaticImage(id, w, x, y, z, rx, ry, rz){
	
	const im = new StaticImage( id, w, x, y, z, rx, ry, rz ); 
	
	// Add to scene
	im.addTo( sceneWebGL );
	im.addGUI( gui.elements );
	
	const tc = im.gui.controllers.find(c=>c.property=="positioning");
	allTransformControllers.push(tc);
	tc.onChange(function(v){
		// If the value is false, then nothing should happen.
		obj.created.then( webGLImage=>{
			switchTransformObject( v, tc, webGLImage )
		}); // then
	});
	
} // addStaticImage

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

function addIsoSurface( configFilename ){
	
	const iso = new IsoSurface( configFilename );
	iso.addTo( sceneWebGL );
	iso.addGUI( gui.elements );
	
} // addIsoSurface


function addAnimatedStreamlines( configFilename ){
	
	const streamlines = new AnimatedStaticStreamlines( configFilename, colorbar.uniforms );
	streamlines.addTo( sceneWebGL ); 
	streamlines.addGUI(gui.elements);
	
	// Streamlines need to be made aware of an external update.
	elementsThatNeedToBeUpdated.push(streamlines);
	
	streamlines.nlines(0,100);
	console.log(streamlines)
} // addAnimatedStreamlines









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

} // setupHUD



// CONTROLS - ADDED TO CSS RENDERER!!!!
function addArcballControls(){
	
	arcballcontrols = new ArcballControls( camera, rendererCSS.domElement, sceneWebGL );
	arcballcontrols.focus( focusInitialPoint, 1, 1 );
	
	// Adding hte controls, and changing the focus will both change the position of hte camera. When manually repositioning the camera, the controls need to be updated.
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	arcballcontrols.update();

	console.log(setGizmoOpacity)
	console.log(arcballcontrols)
	
} // addArcballControls


function setGizmoOpacity(active){
	arcballcontrols._gizmos.children.forEach(function(gizmoLine){
		gizmoLine.material.setValues( { opacity: 1*active } );
	}) // forEach
} // setGizmoOpacity



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