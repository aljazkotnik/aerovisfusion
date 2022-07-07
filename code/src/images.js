import * as THREE from "three";

import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';


/*
We want to draw a video into a scene. The challenges are: hosting a video, drawing it as a texture, and implementing hte necessary controls.

A video hosting platform already exists: YouTube.

Videos can be drawn to a canvas, which can then be drawn to a texture. Apparently the browser offers some controls anyway.

CSS3DRenderer allows an iFrame to be rendered as a texture, which allows the use of native YouTube controls.


*/





var camera;
var scene, renderer;
var sceneCSS, rendererCSS;
var controls;


var container;

function Element( id, x, y, z, ry ) {

	const div = document.createElement( 'div' );
	div.style.width = '480px';
	div.style.height = '360px';
	div.style.backgroundColor = '#000';

	const iframe = document.createElement( 'iframe' );
	iframe.style.width = '480px';
	iframe.style.height = '360px';
	iframe.style.border = '0px';
	iframe.src = [ 'https://www.youtube.com/embed/', id, '?rel=0' ].join( '' );
	div.appendChild( iframe );

	const object = new CSS3DObject( div );
	object.position.set( x, y, z );
	object.rotation.y = ry;

	return object;

}

init();
animate();

function init() {

	// This example has a container and a blocker div!!
	container = document.getElementById( 'css' );

	setupScene();


	const group = new THREE.Group();
	group.add( new Element( 'SJOz3qjfQXU', 0, 0, 240, 0 ) );
	group.add( new Element( 'Y2-xZ-1HE-Q', 240, 0, 0, Math.PI / 2 ) );
	group.add( new Element( 'IrydklNpcFI', 0, 0, - 240, Math.PI ) );
	group.add( new Element( '9ubytEsCaS0', - 240, 0, 0, - Math.PI / 2 ) );
	sceneCSS.add( group );

	controls = new TrackballControls( camera, rendererCSS.domElement );
	controls.rotateSpeed = 4;

	window.addEventListener( 'resize', onWindowResize );

	

} // init



function setupScene(){
	
	// CAMERA
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 5000 );
	camera.position.set( 500, 350, 750 );
	
	// SCENES
	scene = new THREE.Scene();
	sceneCSS = new THREE.Scene();
	
	// ADD THE LIGHTS
	
	
	
	
	// RENDERERS
	rendererCSS = new CSS3DRenderer();
    rendererCSS.setSize( window.innerWidth, window.innerHeight );
    rendererCSS.domElement.style.position = 'absolute';
    rendererCSS.domElement.style.top = 0;
    
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor( 0x000000, 0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    
	
	// APPEND RENDERES
	container.appendChild( rendererCSS.domElement );
	document.querySelector('#webgl').appendChild( renderer.domElement );
	

	
} // setupScene









function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

} // onWindowResize

function animate() {

	requestAnimationFrame( animate );
	controls.update();
	
	render();
} // animate


function render(){
	
	renderer.render(scene, camera);
	rendererCSS.render( sceneCSS, camera );
	
} // render