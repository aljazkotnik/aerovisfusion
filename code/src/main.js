import * as THREE from "three";


/*
	Three.js "tutorials by example"
	Author: Lee Stemkoski
	Date: July 2013 (three.js v59dev)
*/

// MAIN

// standard global variables
var container, scene, camera, renderer, controls, stats;
var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();
// custom global variables
var cube;

init();
animate();

// FUNCTIONS 		
function init() 
{
	// SCENE
	scene = new THREE.Scene();
	// CAMERA
	var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
	scene.add(camera);
	camera.position.set(0,100,400);
	camera.lookAt(scene.position);	
	// RENDERER
	if ( Detector.webgl )
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer(); 
	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	container = document.getElementById( 'ThreeJS' );
	container.appendChild( renderer.domElement );
	// EVENTS
	THREEx.WindowResize(renderer, camera);
	THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
	// CONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.addEventListener( 'change', render );
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
	var floorTexture = new THREE.ImageUtils.loadTexture( 'images/checkerboard.jpg' );
	floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
	floorTexture.repeat.set( 10, 10 );
	var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
	var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
	var floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.position.y = -100.5;
	floor.rotation.x = Math.PI / 2;
	//scene.add(floor);
	
	// SKYBOX/FOG
	var imagePrefix = "images/dawnmountain-";
	var directions  = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
	var imageSuffix = ".png";
	var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );	
	
	var materialArray = [];
	for (var i = 0; i < 6; i++)
		materialArray.push( new THREE.MeshBasicMaterial({
			map: THREE.ImageUtils.loadTexture( imagePrefix + directions[i] + imageSuffix ),
			side: THREE.BackSide
		}));
	var skyMaterial = new THREE.MeshFaceMaterial( materialArray );
	var skyBox = new THREE.Mesh( skyGeometry, skyMaterial );
	scene.add( skyBox );
	
	////////////
	// CUSTOM //
	////////////

	var sphereGeom = new THREE.SphereGeometry(100, 32, 16);
    
	var moonTexture = THREE.ImageUtils.loadTexture( 'images/moon.jpg' );
	var moonMaterial = new THREE.MeshBasicMaterial( { map: moonTexture } );
    var moon = new THREE.Mesh(sphereGeom, moonMaterial);
	moon.position.set(150,0,-150);
    scene.add(moon);

	// create custom material from the shader code above
	//   that is within specially labeled script tags
	var customMaterial = new THREE.ShaderMaterial( 
	{
	    uniforms: 
		{ 
			"c":   { type: "f", value: 1.0 },
			"p":   { type: "f", value: 1.4 },
			glowColor: { type: "c", value: new THREE.Color(0xffff00) },
			viewVector: { type: "v3", value: camera.position }
		},
		vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
		side: THREE.FrontSide,
		blending: THREE.AdditiveBlending,
		transparent: true
	}   );
		
	this.moonGlow = new THREE.Mesh( sphereGeom.clone(), customMaterial.clone() );
    moonGlow.position = moon.position;
	moonGlow.scale.multiplyScalar(1.2);
	scene.add( moonGlow );
	
	var cubeGeom = new THREE.CubeGeometry(150,150,150,2,2,2);
	var crateTexture = THREE.ImageUtils.loadTexture( 'images/crate.png' );
	var crateMaterial = new THREE.MeshBasicMaterial( { map: crateTexture } );
    this.crate = new THREE.Mesh(cubeGeom, crateMaterial);
	crate.position.set(-150,0,-150);
    scene.add(crate);

	var smoothCubeGeom = cubeGeom.clone();
	var modifier = new THREE.SubdivisionModifier( 2 );
	modifier.modify( smoothCubeGeom ); 

	this.crateGlow = new THREE.Mesh( smoothCubeGeom, customMaterial.clone() );
    crateGlow.position = crate.position;
	crateGlow.scale.multiplyScalar(1.5);
	scene.add( crateGlow );
	
	/////////
	// GUI //
	/////////
	
	gui = new dat.GUI();
	parameters = 
	{ c: 1.0, p: 1.4, bs: false, fs: true, nb: false, ab: true, mv: true, color: "#ffff00" };
	
	var top = gui.addFolder('Glow Shader Attributes');
	
	var cGUI = top.add( parameters, 'c' ).min(0.0).max(1.0).step(0.01).name("c").listen();
	cGUI.onChange( function(value) { 
		moonGlow.material.uniforms[ "c" ].value = parameters.c; 
		crateGlow.material.uniforms[ "c" ].value = parameters.c; 
	});
	
	var pGUI = top.add( parameters, 'p' ).min(0.0).max(6.0).step(0.01).name("p").listen();
	pGUI.onChange( function(value) { 
		moonGlow.material.uniforms[ "p" ].value = parameters.p; 
		crateGlow.material.uniforms[ "p" ].value = parameters.p; 	
	});

	var glowColor = top.addColor( parameters, 'color' ).name('Glow Color').listen();
	glowColor.onChange( function(value) {
		moonGlow.material.uniforms.glowColor.value.setHex( value.replace("#", "0x"));   
		crateGlow.material.uniforms.glowColor.value.setHex( value.replace("#", "0x"));   
	});
	top.open();
	
	// toggle front side / back side 
	var folder1 = gui.addFolder('Render side');
	var fsGUI = folder1.add( parameters, 'fs' ).name("THREE.FrontSide").listen();
	fsGUI.onChange( function(value) { 
	    if (value) 
	    {
	        bsGUI.setValue(false);
			moonGlow.material.side = THREE.FrontSide;  
			crateGlow.material.side = THREE.FrontSide;  
	    }
	});
	var bsGUI = folder1.add( parameters, 'bs' ).name("THREE.BackSide").listen();
	bsGUI.onChange( function(value) { 
		if (value)
		{
			fsGUI.setValue(false);
			moonGlow.material.side = THREE.BackSide;  
			crateGlow.material.side = THREE.BackSide;  
		}
	});
	folder1.open();
	
	// toggle normal blending / additive blending
	var folder2 = gui.addFolder('Blending style');
	var nbGUI = folder2.add( parameters, 'nb' ).name("THREE.NormalBlending").listen();
	nbGUI.onChange( function(value) { 
	    if (value) 
	    {
	        abGUI.setValue(false);
			moonGlow.material.blending = THREE.NormalBlending;  
			crateGlow.material.blending = THREE.NormalBlending;
	    }
	});
	var abGUI = folder2.add( parameters, 'ab' ).name("THREE.AdditiveBlending").listen();
	abGUI.onChange( function(value) { 
		if (value)
		{
			nbGUI.setValue(false);
			moonGlow.material.blending = THREE.AdditiveBlending; 
			crateGlow.material.blending = THREE.AdditiveBlending;
		}
	});
	folder2.open();

    // toggle mesh visibility
	var folder3 = gui.addFolder('Miscellaneous');
	var mvGUI = folder3.add( parameters, 'mv' ).name("Meshes-Visible").listen();
	mvGUI.onChange( function(value) { 
		moon.visible = value; 
		crate.visible = value;
	});
	folder3.open();
	
}

function animate() 
{
    requestAnimationFrame( animate );
	render();		
	update();
}

function update()
{
	controls.update();
	stats.update();
	moonGlow.material.uniforms.viewVector.value = 
		new THREE.Vector3().subVectors( camera.position, moonGlow.position );
	crateGlow.material.uniforms.viewVector.value = 
		new THREE.Vector3().subVectors( camera.position, crateGlow.position );
}

function render() 
{
	renderer.render( scene, camera );
}