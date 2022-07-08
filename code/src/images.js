import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";


/*
We want to draw a video into a scene. The challenges are: hosting a video, drawing it as a texture, and implementing hte necessary controls.

A video hosting platform already exists: YouTube.

Videos can be drawn to a canvas, which can then be drawn to a texture. Apparently the browser offers some controls anyway.

CSS3DRenderer allows an iFrame to be rendered as a texture, which allows the use of native YouTube controls.


*/





var camera, controls;
// const domainMidPoint = new THREE.Vector3(0, 0, 0);
// const cameraInitialPoint = new THREE.Vector3(500, 350, 750);
const domainMidPoint = new THREE.Vector3(0.8, 100.1, 0);
const cameraInitialPoint = new THREE.Vector3(domainMidPoint.x, domainMidPoint.y, domainMidPoint.z +1);
/*
wing domain roughly = {
	x = [0, 0.7]
	y = [100.1, 100.4]
	z = [0, 0.3]
}
*/

var sceneWebGL, rendererWebGL;
var sceneCSS, rendererCSS;




// GEOMETRY REFERENCE DECLARATION
// Geometry is declared externally mostly because the decals need access to it.
var mesh;



init();
animate();

function init() {

	
	// FOUNDATIONS
	setupScene();
	// addOrbitControls();
	addTrackballControls(); // scene originally off screen
	
	
	// Add hte geometry.
	addWingGeometry();
	
	
	// Add the video: video id, and world w, x, y, z, and radian rx, ry, rz
	// x=1 looks good, but for intersection x=0.4 can be used.
	addYoutubeVideo( 'JWOH6wC0uTU', 1, 0.4, 100, 0, 0, Math.PI/2, Math.PI/2 );

	
	console.log(camera, [sceneWebGL, sceneCSS])
	
	
	// Make hte camera look at the center
	camera.lookAt( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
	

	window.addEventListener( 'resize', onWindowResize );

	

} // init



function setupScene(){
	
	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	
	// SCENES
	sceneWebGL = new THREE.Scene();
	sceneCSS = new THREE.Scene();
	
	// ADD THE LIGHTS
	
	
	
	
	// RENDERERS
	rendererCSS = new CSS3DRenderer();
    rendererCSS.setSize( window.innerWidth, window.innerHeight );
    rendererCSS.domElement.style.position = 'absolute';
    rendererCSS.domElement.style.top = 0;
    
    rendererWebGL = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rendererWebGL.setClearColor( 0x000000, 0 );
    rendererWebGL.setPixelRatio( window.devicePixelRatio );
    rendererWebGL.setSize( window.innerWidth, window.innerHeight );
    rendererWebGL.shadowMap.enabled = true;
    rendererWebGL.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    
	
	// APPEND RENDERES
	document.getElementById( 'css' ).appendChild( rendererCSS.domElement );
	document.getElementById('webgl').appendChild( rendererWebGL.domElement );
	

	
} // setupScene






// SCENE ELEMENTS:

// VIDEO
function makeCSS3DiFrame( id, w, x, y, z, rx, ry, rz ) {
	
	/*
	SIZING
	
	The iFrame renders the video depending on the pixel width and height it is given - small pixel sizes will have less resolution, and fewer controls. Therefore 480px/360px are hardcoded as the width and height.
	
	By default the pixel distances are converted into world distances as 1-to-1, meaning that a 480px wide iFrame will occupy 480 world units by its width. The appropriate scaling can be done by scale.set() on the CSS3DObject.
	*/
	
	// Assume from the start a wideo with a width of 480px and height of 360 px, but then rescale it.
	// Will this affect the resolution?
	let k = w/480;
	let width = '480px';
	let height = '360px';

	const div = document.createElement( 'div' );
	div.style.width = width;
	div.style.height = height;
	div.style.backgroundColor = '#000';
	div.style.opacity = 1; // 0.5;

	const iframe = document.createElement( 'iframe' );
	iframe.style.width = width;
	iframe.style.height = height;
	iframe.style.border = '0px';
	iframe.src = [ 'https://www.youtube.com/embed/', id, '?rel=0' ].join( '' );
	div.appendChild( iframe );

	const object = new CSS3DObject( div );
	object.scale.set( k, k, k )
	object.position.set( x, y, z );
	object.rotation.set( rx, ry, rz );

	return object;

} // makeCSS3DiFrame


function addYoutubeVideo(id, w, x, y, z, rx, ry, rz){
	// By default the video is oriented witth the width along the x axis and height along the y axis.
	// Therefore it needs to first be rotated around the z axis by -90degrees, and then along the y axis for 90 degrees.
	
	
	let videoIframe = makeCSS3DiFrame( id, w, x, y, z, rx, ry, rz );
	
	
	
	// Think maybe of organising htese planes in a group for clarity. Later on there will be many elements in the scene.
	
	
	// Also need to add in the corresponding cutting plane to the regular scene.
	var cssCutPlaneMaterial = new THREE.MeshPhongMaterial({
		opacity	: 0.2,
		color	: new THREE.Color( Math.random() * 0xffffff ),
		blending: THREE.NoBlending,
		side	: THREE.DoubleSide,
	});
	var cssCutPlaneGeometry = new THREE.PlaneGeometry( 480, 360 );
	var cssCutPlaneMesh = new THREE.Mesh( cssCutPlaneGeometry, cssCutPlaneMaterial );
	
	cssCutPlaneMesh.position.copy( videoIframe.position );
	cssCutPlaneMesh.rotation.copy( videoIframe.rotation );
	cssCutPlaneMesh.scale.copy( videoIframe.scale );
	
	cssCutPlaneMesh.castShadow = false;
	cssCutPlaneMesh.receiveShadow = true;
	
	
	
	sceneCSS.add( videoIframe );
	sceneWebGL.add( cssCutPlaneMesh );
	
} // addYoutubeVideo


function addStaticImage(){
	// Add in the schlieren image as well.
	
} // addStaticImage





// GEOMETRY
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
		
		sceneWebGL.add( mesh );
	}) // Promise.all
} // addWingGeometry




// CONTROLS
function addOrbitControls(){
	// Thecontrols are applied to the CSS element. The WebGL element should be in front, but cannot have pointers because the iFrame interactions need to come through. However, controls only update the camera, and the same camera is used for the CSS and WebGL scenes.
	controls = new OrbitControls( camera, rendererCSS.domElement );
	controls.addEventListener( 'change', render );
	controls.target.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
} // addOrbitControls


function addTrackballControls(){
	
	controls = new TrackballControls(camera, rendererCSS.domElement);
	
	controls.panSpeed = 0.1;
	controls.rotateSpeed = 1;
	controls.zoomSpeed = 0.1;
	
	controls.target.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
	
	console.log(controls)
	
} // addTrackballControls





function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	rendererWebGL.setSize( window.innerWidth, window.innerHeight );
	rendererCSS.setSize( window.innerWidth, window.innerHeight );
	
} // onWindowResize

function animate() {

	requestAnimationFrame( animate );
	controls.update();
	
	render();
} // animate


function render(){
	
	rendererWebGL.render(sceneWebGL, camera);
	rendererCSS.render(sceneCSS, camera );
	
} // render