/*
The scene includes the Earth, the Moon, and 200 randomly positioned boxes - satellites. This scene was selected as it required no data to be imported.

This demo supports the addition of annotation spheres. Spheres are positioned by clicking on the screen, but can only be added on the satellites. Note that spheres are also positioned on satellites obscured by the earth or moon.

To adjust hte size and depth (relative to current viewplane) of the spheres the user can click a particular sphere, and use the sliders controls. The sliders are centered at 0, and always return to 0 after interacting with them. Negative values are left, and positive ones right. The sliders work incrementally - on every change of the slider value the corresponding property is incremented by a multitude of the slider value. The farther to the edges the user moves the larger the increment. This allows for both fine and coarse adjustments without the need to rescale the slider values. The depth is adjusted along the vector pointing from the camera viewpoint to the sphere centerpoint.

To remove the sphere the user must toggle the sponge button (on when it has an outline, off when it doesn't), and then click on hte spheres to remove.
*/
import HUD from "./GUI/HUD.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { FlyControls } from "three/examples/jsm/controls/FlyControls.js";

// Add in the HUD.
var hud = new HUD();
document.body.appendChild(hud.node);




var VIEW_ANGLE = 45; // 70
var NEAR = 0.01; // 0.01
var FAR = 20000; // 10
var cameraViewVector = new THREE.Vector3( ); // Instantiate vector once and resue. Apparently good for speed?
const camera = new THREE.PerspectiveCamera( VIEW_ANGLE, window.innerWidth / window.innerHeight, NEAR, FAR );
camera.position.set(0,0,400); // Camera starting position
const scene = new THREE.Scene();


// For use with Ligth the materials should not be THREE.MeshBasicMaterial
const light = new THREE.DirectionalLight( 0xffffff, 1 );
light.position.set( 1, 1, 1 ).normalize();
scene.add( light );



// RAYCASTING HELPERS
var intersects, intersected;
var cameraDirection = new THREE.Vector3(0,0,-1);
const pointer = new THREE.Vector2();
var raycaster = new THREE.Raycaster();


// MOON.
// SphereGeometry(radius : Float, widthSegments : Integer, heightSegments : Integer, phiStart : Float, phiLength : Float, thetaStart : Float, thetaLength : Float)
var moonGeom = new THREE.SphereGeometry(100, 32, 16);
var moonTexture = new THREE.TextureLoader().load( './assets/moon.jpg' );
var moonMaterial = new THREE.MeshBasicMaterial( { map: moonTexture } );
var moon = new THREE.Mesh(moonGeom, moonMaterial);
moon.position.set(0,0,-150);
scene.add(moon);



// EARTH. It's diameter is supposed to be 4 times larger.
var earthGeom = new THREE.SphereGeometry(400, 32, 16);
var earthTexture = new THREE.TextureLoader().load( './assets/earth.jpg' );
var earthMaterial = new THREE.MeshBasicMaterial( { map: earthTexture } );
var earth = new THREE.Mesh(earthGeom, earthMaterial);
earth.position.set(0,0,-1000);
scene.add(earth);


// ENVIRONMENT
// It's just a square within which the scene is set! So the images are set onto the square sides to make the 3D illusion.
// Could be nice to add some stars?




// DEFINE THE ANNOTATION SPHERE AND APPEARANCE
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

var annotationSphereGeom = new THREE.SphereGeometry(1, 32, 16);
var annotationSphereMaterial = customMaterial.clone();
var annotationSphereSphere = new THREE.Mesh( annotationSphereGeom, annotationSphereMaterial );





// ADD SATELLITES TO SCENE
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

// Aim the controls at the center of hte earth - it's the earth that has satellites around it.
controls.target.set(0,0,-1000)




// ANNOTATIONS
// What about moving the aim sphere onth escrene? That could be done with drag and drop?
// Or just use 3 sliders for x, y, and z, and one for radius? Then the camera will be able to move around independently. But then they need to know the size of the annotatable space. Maybe that's not so much a problem?
// Start positioning by where the camera is, and then adjust?

// Just place the item where it is, and then allows adjustments? So make the sphere as it is now, and then use a raycaster to see if the object should be selected, and allow the sphere to be moved in the current x-y plane?
// Simplest demo is to position via screen position, and use sliders, and then confirm? Maybe with a submit button in the UI. And no aiming sphere - a sphere should just appear when it's first added.
var annotations = [];
function addSphere(x,y,z,r){
	// The annotation size should be determined by the aiming sphere.
	let annotationGlow = new THREE.Mesh( annotationSphereGeom.clone(), customMaterial.clone() );
	
	// THE POSITION SHOULD COME FROM THE MOUSE AND THE INTERSECT.
	annotationGlow.position.set(x, y, z);
	annotationGlow.scale.setScalar( r )
	scene.add( annotationGlow );
	annotations.push(annotationGlow);
} // addSphere

function removeSphere(s){
	scene.remove(s);
	annotations.splice(annotations.indexOf(s),1);
} // removeSphere


function returnFirstIntersection(candidates){
	raycaster.setFromCamera( pointer, camera );
	intersects = raycaster.intersectObjects( candidates, false );
	return intersects[0];
} // returnFirstIntersection

function mouseEventMovementDistanceSquared(origin,finish){
	return (origin.clientX - finish.clientX)**2 + (origin.clientY - finish.clientY)**2;
} // mouseEventMovementDistanceSquared


// Maybe add the sphere on mouseup - then if it's just a click the sphere can be added. 
// This approach means that the user cannot draw - they specifically add in individual spheres.

var selectedSphere
var mouseDownEvent

renderer.domElement.addEventListener("mousedown", function(e){
	mouseDownEvent = e;
}) // addEventListener

renderer.domElement.addEventListener("mousedown", function(e){
	let p = returnFirstIntersection(annotations);
	
	// First uncolor all spheres.
	annotations.forEach(a=>{
		a.material.uniforms.glowColor.value.setRGB(1,1,0);
	}); // forEach
	
	// Change that spheres color.
	if(p){
		selectedSphere = p.object;
		selectedSphere.material.uniforms.glowColor.value.setRGB(1,0,0);
	} else {
		selectedSphere = undefined;
	} // if
}) // addEventListener


renderer.domElement.addEventListener("mouseup", function(e){
	
	// Has the mouse moved since mousedown?
	if(mouseEventMovementDistanceSquared(mouseDownEvent, e) < 1){
		e.preventDefault();
	
		let p = returnFirstIntersection(satellites);
		if(p && !selectedSphere && !hud.aui.erase){			
		  // CALCULATE THE SPHERE SIZE BASED ON DISTANCE SOMEHOW
		  addSphere(p.point.x, p.point.y, p.point.z, 100);
		} else if(selectedSphere && hud.aui.erase){
		  // Remove this sphere.
		  removeSphere(selectedSphere)
		  selectedSphere = undefined;
		}// if
	} // if
}) // addEventListener


// Allow adjusting the sphere radius.
hud.aui.radiusInput.addEventListener("input", function(e){
	// Change the radius of the currently selected sphere.
	if(selectedSphere){
		selectedSphere.scale.addScalar(hud.aui.radiusInput.value*10);
	} // if
}) // addEventListener

hud.aui.distanceInput.addEventListener("input", function(e){
	// Add a vector to the sphere. The vector should go from the camera point through the center of the sphere.
	if(selectedSphere){
		// Get the direction of the camera.
		let x = selectedSphere.position.x + 0.01*hud.aui.distanceInput.value*(selectedSphere.position.x - camera.position.x);
		let y = selectedSphere.position.y + 0.01*hud.aui.distanceInput.value*(selectedSphere.position.y - camera.position.y);
		let z = selectedSphere.position.z + 0.01*hud.aui.distanceInput.value*(selectedSphere.position.z - camera.position.z);
		
		selectedSphere.position.set(x, y, z);
	} // if
}) // addEventListener




// Updating the pointer object.
document.addEventListener( 'mousemove', onPointerMove );
function onPointerMove( event ) {
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
} // onPointerMove






var viewAdjustVector = new THREE.Vector3();
function adjustGlowToView(sphere){
	sphere.material.uniforms.viewVector.value = 
		viewAdjustVector.subVectors( camera.position, sphere.position );
} // adjustGlowToView

function highlightIntersectedSatellite(){
	
	// Do the raycaster intersects. `intersected' is defined at the start.
	
	// Handle the intersects
	let p = returnFirstIntersection(satellites);
	if ( p ) {
		if ( intersected != p.object ) {
			if ( intersected ) intersected.material.emissive.setHex( intersected.currentHex );

			// Refresh the currently intersected reference, store its current color, and set it a different emmisivity.
			intersected = p.object;
			intersected.currentHex = intersected.material.emissive.getHex();
			intersected.material.emissive.setHex( 0xff0000 );
			
			console.log("Intersection!")
		} // if

	} else {
		// Set the emmisivity to the previous color, and clear the reference to the intersected object.
		if ( intersected ) intersected.material.emissive.setHex( intersected.currentHex );
		intersected = null;
	} // if
	
} // highlightIntersectedSatellite





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

function render(){	

	
	// ADJUST THE ANNOTATION GLOW TO THE VIEW
	annotations.forEach(a=>{
		adjustGlowToView(a);
	}) // forEach
			
	
	
	// Do the raycaster intersects. `intersected' is defined at the start.
	highlightIntersectedSatellite();
	
	
		
	renderer.render( scene, camera )
} //render






