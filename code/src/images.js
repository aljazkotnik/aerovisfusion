import * as THREE from "three";
import { ArcballControls } from "three/examples/jsm/controls/ArcballControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";


// Specifically for video rendering.
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

// Components.
import IframeVideo from "./components/IframeVideo.js";
import StaticImage from "./components/StaticImage.js";
import ContouredMesh from "./components/ContouredMesh.js";
import ColorBar from "./GUI/ColorBar.js";

// GUI builder
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";



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



// Make the overall GUI for elements.
const gui = new GUI();
const elementsGUI = gui.addFolder("Elements");
const addElementGUI = gui.addFolder("Add element");

// The button should open a modal, or append a selection to the GUI to configure the element to be added.
const addElementConfig = {
	type: '',
	name: 'type in asset address',
	add: function(el){
		// Evaluate the current config and clear it.
		
		switch( addElementConfig.type ){
			case "Image":
				addStaticImage( './assets/schlieren_mon_15p_0s_flat_side_flipped.jpg', 1, 0.4, 100, 0, Math.PI/2, 0, 0);
				break;
			case "Video":
				addYoutubeVideo( 'JWOH6wC0uTU', 1, 0.8, 100, 0, 0, Math.PI/2, Math.PI/2 );
				break;
			default:
		}; // switch
	}
}


addElementGUI.add( addElementConfig, "type", ['','Image','Video'] ) // dropdown
addElementGUI.add( addElementConfig, "name" ); 	// text field
addElementGUI.add( addElementConfig, "add" ); 	// button




var allTransformControllers = [];






// GEOMETRY REFERENCE DECLARATION
// Geometry is declared externally mostly because the decals need access to it.
var mesh;

init();
animate();

function init() {

	setupScene();
	
	
	addArcballControls();
	addTransformControls();
	console.log(transformcontrols)
	
	// Add hte geometry.
	addWingGeometry();
	
	
	// For development
	addStaticImage( './assets/schlieren_mon_15p_0s_flat_side_flipped.jpg', 1, 0.4, 100, 0, Math.PI/2, 0, 0);
	addYoutubeVideo( 'JWOH6wC0uTU', 1, 0.8, 100, 0, 0, Math.PI/2, Math.PI/2 );

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
	rendererCSS.name = "rendererCSS";
    
    rendererWebGL = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rendererWebGL.setClearColor( 0x000000, 0 );
    rendererWebGL.setPixelRatio( window.devicePixelRatio );
    rendererWebGL.setSize( window.innerWidth, window.innerHeight );
    rendererWebGL.shadowMap.enabled = true;
    rendererWebGL.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    rendererWebGL.name = "rendererWebGL";
	
	
	// APPEND RENDERES
	document.getElementById( 'css' ).appendChild( rendererCSS.domElement );
	document.getElementById('webgl').appendChild( rendererWebGL.domElement );
	

	
} // setupScene






// SCENE ELEMENTS:

// VIDEO
function addYoutubeVideo(id, w, x, y, z, rx, ry, rz){
	// By default the video is oriented witth the width along the x axis and height along the y axis.
	// Therefore it needs to first be rotated around the z axis by -90degrees, and then along the y axis for 90 degrees.

	
	let iv = new IframeVideo( id, w, x, y, z, rx, ry, rz );
	
	sceneCSS.add( iv.cssItem );
	sceneWebGL.add( iv.webGLItem );
	
	//Add the gui elements also.
	// Add GUI controllers.
	const imGUI = elementsGUI.addFolder( "Image: " + iv.config.name );
	
	imGUI.add( iv.config, "name" ); 	   // text field
	imGUI.add( iv.config, "visible" ); 	   // boolean
	let tc = imGUI.add( iv.config, "positioning" ); // boolean
	allTransformControllers.push(tc);
	
	iv.config.remove = function(){
		imGUI.destroy();
		const index = allTransformControllers.indexOf(tc);
		if (index > -1) { // only splice array when item is found
		  allTransformControllers.splice(index, 1); // 2nd parameter means remove one item only
		} // if
		
		sceneCSS.remove( iv.cssItem );
		sceneWebGL.remove( iv.webGLItem );
	} // remove
	
	imGUI.add( iv.config, "remove" );      // button
	

	tc.onChange(function(v){
		// If the value is false, then nothing should happen.
		switchTransformObject( v, tc, iv.cssItem, function(){ iv.ontransform() }) 
	});

} // addYoutubeVideo


function addStaticImage(id, w, x, y, z, rx, ry, rz){
	
	const im = new StaticImage( id, w, x, y, z, rx, ry, rz ); 
	
	// Add to scene
	var item;
	im.created.then( webGLImage=>{
		item = webGLImage;
		sceneWebGL.add( webGLImage );
	});
	
	
	// Add GUI controllers.
	const imGUI = elementsGUI.addFolder( "Image: " + im.config.name );
	
	imGUI.add( im.config, "name" ); 	   // text field
	imGUI.add( im.config, "visible" ); 	   // boolean
	let tc = imGUI.add( im.config, "positioning" ); // boolean
	allTransformControllers.push(tc);
	
	im.config.remove = function(){
		imGUI.destroy();
		const index = allTransformControllers.indexOf(tc);
		if (index > -1) { // only splice array when item is found
		  allTransformControllers.splice(index, 1); // 2nd parameter means remove one item only
		} // if
		
		im.created.then( webGLImage=>{
			sceneWebGL.remove( webGLImage );
		});
	} // remove
	
	imGUI.add( im.config, "remove" );      // button
	
	
	tc.onChange(function(v){
		// If the value is false, then nothing should happen.
		switchTransformObject( v, tc, item ) 
	});
	
} // addStaticImage





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




// CONTROLS - ADDED TO CSS RENDERER!!!!
function addArcballControls(){
	
	arcballcontrols = new ArcballControls( camera, rendererCSS.domElement, sceneWebGL );
	arcballcontrols.focus( focusInitialPoint, 1, 1 );
	
	
	// Adding hte controls, and changing the focus will both change the position of hte camera. When manually repositioning the camera, the controls need to be updated.
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	arcballcontrols.update();
	
	
	
	
	
} // addArcballControls

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
	console.log("switch")
	
	// If the value is false, then nothing should happen, unless the same object is currently being used by the transform controls.
	if(v){ 
	
		let switchOff = allTransformControllers.filter(tc=>tc!=controller)
		switchOff.forEach(tc=>tc.setValue(false))
		
		
		transformcontrols.attach( object );
		if( ontransform ){ transformcontrols.addEventListener( 'change', ontransform ); } // if
		
	} else if( transformcontrols.object == object ){
		// Check if the transform should be detached.
		transformcontrols.detach();
	} // if
	
	
	// At the end check if ht informationshould bdisplayed.
	
	
} // switchTransformObject



function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	rendererWebGL.setSize( window.innerWidth, window.innerHeight );
	rendererCSS.setSize( window.innerWidth, window.innerHeight );
	
} // onWindowResize

function animate() {
	requestAnimationFrame( animate );
	render();
} // animate


function render(){
	
	rendererWebGL.render(sceneWebGL, camera);
	rendererCSS.render(sceneCSS, camera );
	
} // render