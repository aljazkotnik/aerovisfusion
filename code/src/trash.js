import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

import Stats from "stats.js";


/*
We want to draw a video into a scene. The challenges are: hosting a video, drawing it as a texture, and implementing hte necessary controls.

A video hosting platform already exists: YouTube.

Videos can be drawn to a canvas, which can then be drawn to a texture. Apparently the browser offers some controls anyway.

CSS3DRenderer allows an iFrame to be rendered as a texture, which allows the use of native YouTube controls.


*/




class KeyboardState{
  constructor(){
	let obj = this;
	
	window.onkeydown = function(e){
		e = e || window.event;
		obj[e.key] = true;
	}; // onkeydown
	
	window.onkeyup = function(e){
		e = e || window.event;
		delete obj[e.key];
	}; // onkeydown
	
  } // constructor
  
  pressed(key){
	  return this[key]
  }
    
} // KeyboardState








/* TEMPLATE ORIGIN
	Three.js "tutorials by example"
	Author: Lee Stemkoski
	Date: July 2013 (three.js v59dev)
*/
/*
// MAIN

// standard global variables
var container, scene, camera, renderer, controls, stats;
var keyboard = new KeyboardState();

// custom global variables
var video, videoImage, videoImageContext, videoTexture;

init();
animate();

// FUNCTIONS 		
function init(){
	// SCENE
	scene = new THREE.Scene();
	// CAMERA
	var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
	scene.add(camera);
	camera.position.set(0,150,400);
	camera.lookAt(scene.position);	
	// RENDERER
	
	renderer = new THREE.WebGLRenderer( {antialias:true} );
	 
	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	container = document.getElementById( 'container' );
	container.appendChild( renderer.domElement );
	// CONTROLS
	controls = new OrbitControls( camera, renderer.domElement );
	
	
	
	// EVENTS
	window.addEventListener( 'resize', onWindowResize );
	
	
	
	
	// STATS
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild( stats.domElement );
	// LIGHT
	var light = new THREE.PointLight(0xffffff);
	light.position.set(0,250,0);
	scene.add(light);
	// FLOOR
	var floorTexture = new THREE.ImageUtils.loadTexture( 'assets/earth.jpg' );
	floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
	floorTexture.repeat.set( 10, 10 );
	var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
	var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
	var floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.position.y = -0.5;
	floor.rotation.x = Math.PI / 2;
	scene.add(floor);
	// SKYBOX/FOG
	var skyBoxGeometry = new THREE.BoxGeometry( 10000, 10000, 10000 );
	var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0x9999ff, side: THREE.BackSide } );
	var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
	// scene.add(skyBox);
	scene.fog = new THREE.FogExp2( 0x9999ff, 0.00025 );
	
	
	///////////
	// VIDEO //
	///////////
	
	// create the video element
	video = document.createElement( 'video' );
	// video.id = 'video';
	// video.type = ' video/ogg; codecs="theora, vorbis" ';
	let videoid = "watch?v=JWOH6wC0uTU"
	video.src = [ 'https://www.youtube.com/embed/', videoid, '?rel=0' ].join( '' );
	video.load(); // must call after setting/changing source
	video.play();
	
	// alternative method -- 
	// create DIV in HTML:
	// <video id="myVideo" autoplay style="display:none">
	//		<source src="videos/sintel.ogv" type='video/ogg; codecs="theora, vorbis"'>
	// </video>
	// and set JS variable:
	// video = document.getElementById( 'myVideo' );
	
	videoImage = document.createElement( 'canvas' );
	videoImage.width = 480;
	videoImage.height = 204;

	videoImageContext = videoImage.getContext( '2d' );
	// background color if no video present
	videoImageContext.fillStyle = '#000000';
	videoImageContext.fillRect( 0, 0, videoImage.width, videoImage.height );

	videoTexture = new THREE.Texture( videoImage );
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;
	
	var movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
	// the geometry on which the movie will be displayed;
	// 		movie image will be scaled to fit these dimensions.
	var movieGeometry = new THREE.PlaneGeometry( 240, 100, 4, 4 );
	var movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
	movieScreen.position.set(0,50,0);
	scene.add(movieScreen);
	
	camera.position.set(0,150,300);
	camera.lookAt(movieScreen.position);
				
	
}




function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	renderer.setSize( window.innerWidth, window.innerHeight );
} // onWindowResize











function animate() 
{
    requestAnimationFrame( animate );
	render();		
	update();
}

function update()
{
	if ( keyboard.pressed("p") )
		video.play();
		
	if ( keyboard.pressed("space") )
		video.pause();

	if ( keyboard.pressed("s") ) // stop video
	{
		video.pause();
		video.currentTime = 0;
	}
	
	if ( keyboard.pressed("r") ) // rewind video
		video.currentTime = 0;
	
	controls.update();
	stats.update();
}

function render() 
{	
	if ( video.readyState === video.HAVE_ENOUGH_DATA ) 
	{
		videoImageContext.drawImage( video, 0, 0 );
		if ( videoTexture ) 
			videoTexture.needsUpdate = true;
	}

	renderer.render( scene, camera );
}


*/










// 2 SCENE APPROACH

var windowHalfX, windowHalfY

var camera
var scene, renderer;
var scene2, renderer2;

var mouseX = 0, mouseY = 0;

var controls;

var sphere;

var lights = [];

var lookAt = new THREE.Vector3(0, 0, 0);

var lightMovementAmplitude = 200

init();
animate(performance.now());

function init() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera = new THREE.PerspectiveCamera(
        45, window.innerWidth / window.innerHeight, 1, 2000
    );
    camera.position.set( 0, 0, 500 );

    scene = new THREE.Scene();
    scene2 = new THREE.Scene();

    for ( var i = 0; i < 50; i ++ ) {

        var element = document.createElement( 'div' );
        element.style.width = '100px';
        element.style.height = '100px';
        element.style.opacity = 0.999;
        element.style.background = new THREE.Color(
          Math.random() * 0.21568627451 + 0.462745098039,
          Math.random() * 0.21568627451 + 0.462745098039,
          Math.random() * 0.21568627451 + 0.462745098039,
        ).getStyle();
        element.textContent = "I am editable text!"
        element.setAttribute('contenteditable', '')

        var domObject = new CSS3DObject( element );
        domObject.position.x = Math.random() * 600 - 300;
        domObject.position.y = Math.random() * 600 - 300;
        domObject.position.z = Math.random() * 800 - 600;
        domObject.rotation.x = Math.random();
        domObject.rotation.y = Math.random();
        domObject.rotation.z = Math.random();
        //domObject.scale.x = Math.random() + 0.5;
        //domObject.scale.y = Math.random() + 0.5;
        scene2.add( domObject );

        // make an invisible plane for the DOM element to chop
        // clip a WebGL geometry with it.
        // function(){
            var material = new THREE.MeshPhongMaterial({
                opacity	: 0.2,
                color	: new THREE.Color('black'),
                blending: THREE.NoBlending,
                side	: THREE.DoubleSide,
            });
            var geometry = new THREE.PlaneGeometry( 100, 100 );
            var mesh = new THREE.Mesh( geometry, material );
            mesh.position.copy( domObject.position );
            mesh.rotation.copy( domObject.rotation );
            //mesh.scale.copy( domObject.scale );
            mesh.castShadow = false;
            mesh.receiveShadow = true;
            scene.add( mesh );
        // }()
        //function() {
            //var material = new THREE.ShadowMaterial({
                //opacity	: 0.2,
                ////color	: new THREE.Color('black'),
                ////blending: THREE.NoBlending,
                ////side	: THREE.DoubleSide,
            //});
            //var geometry = new THREE.PlaneGeometry( 100, 100 );
            //var mesh = new THREE.Mesh( geometry, material );
            //mesh.position.copy( domObject.position );
            //mesh.rotation.copy( domObject.rotation );
            ////mesh.scale.copy( domObject.scale );
            //scene.add( mesh );
        //}()

    } // for

    // make a geometry to see if we can clip it with the DOM elememt.
    // function() {
        var material = new THREE.MeshPhongMaterial({
            color: 0x156289,
            emissive: 0x000000,
            specular: 0x111111,
            side: THREE.DoubleSide,
            flatShading: false,
            shininess: 30,
        })
        var geometry = new THREE.SphereGeometry( 70, 32, 32 );
        sphere = new THREE.Mesh( geometry, material );
        sphere.position.z = 100;
        sphere.castShadow = true;
        sphere.receiveShadow = false;
        scene.add( sphere );
    // }()

    // light
    // function() {
        var ambientLight = new THREE.AmbientLight( 0x000000 );
        scene.add( ambientLight );

        lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
        lights[ 0 ].castShadow = true;
        lights[ 0 ].position.z = 300;
        lights[ 0 ].shadow.mapSize.width = 256;  // default
        lights[ 0 ].shadow.mapSize.height = 256; // default
        lights[ 0 ].shadow.camera.near = 1;       // default
				lights[ 0 ].shadow.camera.far = 2000;      // default

        scene.add( lights[ 0 ] );
    // }()

    //

    renderer2 = new CSS3DRenderer();
    renderer2.setSize( window.innerWidth, window.innerHeight );
    renderer2.domElement.style.position = 'absolute';
    renderer2.domElement.style.top = 0;
    document.querySelector('#css').appendChild( renderer2.domElement );

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor( 0x000000, 0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    document.querySelector('#webgl').appendChild( renderer.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );

}

function onDocumentMouseMove( event ) {
    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;
}

function animate(time) {

    sphere.position.x += ( mouseX - sphere.position.x ) * .02;
    sphere.position.y += ( -mouseY - sphere.position.y ) * 0.02;
    
    lights[ 0 ].position.x = 200 * Math.sin(time * 0.003);
    lights[ 0 ].position.y = 200 * Math.cos(time * 0.002);

    scene.updateMatrixWorld()

    lookAt.setFromMatrixPosition(sphere.matrixWorld)
    camera.lookAt(lookAt);

    renderer.render( scene, camera );
    renderer2.render( scene2, camera );

    requestAnimationFrame( animate );
}