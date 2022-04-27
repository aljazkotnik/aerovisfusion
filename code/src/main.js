import HUD from "./GUI/HUD.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { FlyControls } from "three/examples/jsm/controls/FlyControls.js";

// Add in the HUD.
var hud = new HUD();
document.body.appendChild(hud.node);




var VIEW_ANGLE = 45; // 70
var NEAR = 0.1; // 0.01
var FAR = 20000; // 10
var cameraViewVector = new THREE.Vector3( ); // Instantiate vector once and resue. Apparently good for speed?
const camera = new THREE.PerspectiveCamera( VIEW_ANGLE, window.innerWidth / window.innerHeight, NEAR, FAR );
camera.position.set(0,0,400); // Camera starting position
const scene = new THREE.Scene();



// For use with Ligth the materials should not be THREE.MeshBasicMaterial
const light = new THREE.DirectionalLight( 0xffffff, 1 );
light.position.set( 1, 1, 1 ).normalize();
scene.add( light );


// A raycaster to help with interactions.
var intersects, intersected;
const pointer = new THREE.Vector2();
var raycaster = new THREE.Raycaster();


// Make a Moon.
// SphereGeometry(radius : Float, widthSegments : Integer, heightSegments : Integer, phiStart : Float, phiLength : Float, thetaStart : Float, thetaLength : Float)
var moonGeom = new THREE.SphereGeometry(100, 32, 16);
var moonTexture = new THREE.TextureLoader().load( './assets/moon.jpg' );
var moonMaterial = new THREE.MeshBasicMaterial( { map: moonTexture } );
var moon = new THREE.Mesh(moonGeom, moonMaterial);
moon.position.set(0,0,-150);
scene.add(moon);



// Make the earth. It's diameter is supposed to be 4 times larger.
var earthGeom = new THREE.SphereGeometry(400, 32, 16);
var earthTexture = new THREE.TextureLoader().load( './assets/earth.jpg' );
var earthMaterial = new THREE.MeshBasicMaterial( { map: earthTexture } );
var earth = new THREE.Mesh(earthGeom, earthMaterial);
earth.position.set(0,0,-1000);
scene.add(earth);







// Add in many boxes to test out the pointing initially.
const box = new THREE.BoxGeometry( 20, 20, 20 );
var satellites = []
for ( let i = 0; i < 200; i ++ ) {


	const object = new THREE.Mesh( box, new THREE.MeshLambertMaterial( { color: Math.random()*0xffffff } ) );

	// Position the box at a random position vector from earth origin at (0,0,-1000)
	let a = Math.random();
	let x = 2*Math.random()-1;
	let y = 2*Math.random()-1;
	let z = 2*Math.random()-1;
	let L = Math.sqrt(x**2+y**2+z**2);
	object.position.set(x/L*(a*100 + 400),y/L*(a*100 + 400), z/L*(a*100 + 400) - 1000)

    
	// object.rotation.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI)

	object.rotation.x = Math.random() * 2 * Math.PI;
	object.rotation.y = Math.random() * 2 * Math.PI;
	object.rotation.z = Math.random() * 2 * Math.PI;

	object.scale.x = Math.random() + 0.5;
	object.scale.y = Math.random() + 0.5;
	object.scale.z = Math.random() + 0.5;

	scene.add( object );

	satellites.push(object)
}







// Glow material
var customMaterial = new THREE.ShaderMaterial( 
{
	uniforms: 
	{ 
		"c":   { type: "f", value: 1.0 },
		"p":   { type: "f", value: 1.4 },
		glowColor: { type: "c", value: new THREE.Color(0xffff00) },
		viewVector: { type: "v3", value: camera.position }
	},
	vertexShader:   `
		uniform vec3 viewVector;
		uniform float c;
		uniform float p;
		varying float intensity;
		void main() 
		{
			vec3 vNormal = normalize( normalMatrix * normal );
			vec3 vNormel = normalize( normalMatrix * viewVector );
			intensity = pow( c - dot(vNormal, vNormel), p );
			
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
		`,
	fragmentShader: `
		uniform vec3 glowColor;
		varying float intensity;
		void main() 
		{
			vec3 glow = glowColor * intensity;
			gl_FragColor = vec4( glow, 1.0 );
		}
		`,
	side: THREE.FrontSide,
	blending: THREE.AdditiveBlending,
	transparent: true
}   );
	
	
// var moonGlow = new THREE.Mesh( moonGeom.clone(), customMaterial.clone() );
// moonGlow.position.set(moon.position.x, moon.position.y, moon.position.z);
// moonGlow.scale.multiplyScalar(1.2);
// scene.add( moonGlow );








// ENVIRONMENT
// It's just a square within which the scene is set! So the images are set onto the square sides to make the 3D illusion.
// Could be nice to add some stars?





// AIMING AID
// What about FPS aiming, but it produces squares? A raycaster is used to compute the intersection of an object and the view vector. At the intersection a box is placed. If a box is targeted, then a box is positioned near it. And a laser aim can be added also if needed.
// But it'll be dificult to envelop features in the space.


// Click on object to change size? 
// Assume a isometric plane based on camera position? And allow drag and drop based on that? And panning hte camera moves the plane? Maybe instead of the aiming the sphere is positioned by clicking on the mouse? Maybe the aim sphere hould follow the mouse?
// How to delete parts of the annotation that are not well placed?


// Add an aiming aid. The aim geometry is controlled through the HUD UI. So configure the slider there, and then use the value from it.


hud.aui.aimSphereRadiusConfig(1,10,1);
hud.aui.aimSphereDistanceConfig(NEAR, NEAR+400, NEAR+100);



var aimGeom = new THREE.SphereGeometry(1, 32, 16);
var aimMaterial = customMaterial.clone();
aimMaterial.uniforms.glowColor = { type: "c", value: new THREE.Color("#ff000e") }
var aimSphere = new THREE.Mesh( aimGeom, aimMaterial );
positionAimSphere();
scene.add(aimSphere);

function positionAimSphere(){
	camera.getWorldDirection( cameraViewVector )
	aimSphere.position.set( 
		camera.position.x + hud.aui.aimSphereDistance*cameraViewVector.x, 
		camera.position.y + hud.aui.aimSphereDistance*cameraViewVector.y,
		camera.position.z + hud.aui.aimSphereDistance*cameraViewVector.z
	);
} // positionAimSphere

function scaleAimSphere(){
	aimSphere.scale.setScalar(hud.aui.aimSphereRadius)
} // scaleAimSphere


hud.aui.aimSphereRadiusInput.oninput = function(){
	scaleAimSphere();
}

hud.aui.aimSphereDistanceInput.oninput = function(){
	positionAimSphere();
}



















// SETUP THE ACTUAL LOOP
// renderer.domElement is created in renderer.
const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animation );
document.body.appendChild( renderer.domElement );


// NAVIGATION CONTROLS
// How should the controls work? It's more convenient to have FPS controls for annotating, but OrbitControls for rotating...
// What about using ESC to toggle from FPS controls to OrbitControls?
// No FPS controls - they don't work on an iPad!!!
const controls = new OrbitControls( camera, renderer.domElement );
controls.addEventListener( 'change', render );




// ANNOTATIONS
// What about moving the aim sphere onth escrene? That could be done with drag and drop?
// Or just use 3 sliders for x, y, and z, and one for radius? Then the camera will be able to move around independently. But then they need to know the size of the annotatable space. Maybe that's not so much a problem?
// Start positioning by where the camera is, and then adjust?

// Just place the item where it is, and then allows adjustments? So make the sphere as it is now, and then use a raycaster to see if the object should be selected, and allow the sphere to be moved in the current x-y plane?
// Simplest demo is to position via screen position, and use sliders, and then confirm? Maybe with a submit button in the UI. And no aiming sphere - a sphere should just appear when it's first added.
var annotations = [];
function addSphere(){
	// The annotation size should be determined by the aiming sphere.
	let annotationGlow = new THREE.Mesh( aimGeom.clone(), customMaterial.clone() );
	annotationGlow.position.set(aimSphere.position.x, aimSphere.position.y, aimSphere.position.z);
	annotationGlow.scale.setScalar( hud.aui.aimSphereRadius )
	scene.add( annotationGlow );
	annotations.push(annotationGlow);
} // addSphere


renderer.domElement.addEventListener("mousedown", function(e){
	if(e.ctrlKey){
		e.preventDefault();
		console.log(e)
		// addSphere();
	} // if
}) // addEventListener



document.addEventListener( 'mousemove', onPointerMove );

function onPointerMove( event ) {
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}


// Animation
function animation( time ) {
	hud.stats.begin()
	
	// maybe here include the change of positions of hte earth and the moon? And their respective rotations?
	
	// The moon now rotates.
	// moon.rotation.x = time / 2000;
	// moon.rotation.y = time / 1000;
	
	render();
	
	hud.stats.end()
} // animation



var viewAdjustVector = new THREE.Vector3();
function adjustGlowToView(sphere){
	sphere.material.uniforms.viewVector.value = 
		viewAdjustVector.subVectors( camera.position, sphere.position );
} // adjustGlowToView



function render(){	

	// controls must be updated... why?
	// controls.update();

	// The glow annotations can be part of an array?
	// adjustGlowToView(moonGlow);
		
		
	// Move the aim sphere with the camera. The cameraViewVector is a unit vector, and I want th esphere to be
	positionAimSphere();
	adjustGlowToView(aimSphere);
	
	
	
	// Do the raycaster intersects.
	raycaster.setFromCamera( pointer, camera );

	intersects = raycaster.intersectObjects( satellites, false );
	if ( intersects.length > 0 ) {

		if ( intersected != intersects[ 0 ].object ) {
			if ( intersected ) intersected.material.emissive.setHex( intersected.currentHex );

			intersected = intersects[ 0 ].object;
			intersected.currentHex = intersected.material.emissive.getHex();
			intersected.material.emissive.setHex( 0xff0000 );
		} // if

	} else {
		if ( intersected ) intersected.material.emissive.setHex( intersected.currentHex );
		intersected = null;
	} // if
	
	
		
	renderer.render( scene, camera )
} //render






