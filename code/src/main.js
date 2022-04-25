import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';



var VIEW_ANGLE = 45; // 70
var NEAR = 0.1; // 0.01
var FAR = 20000; // 10
const camera = new THREE.PerspectiveCamera( VIEW_ANGLE, window.innerWidth / window.innerHeight, NEAR, FAR );
camera.position.set(0,0,400); // Camera starting position
const scene = new THREE.Scene();

const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
const material = new THREE.MeshNormalMaterial();

//const mesh = new THREE.Mesh( geometry, material );
//scene.add( mesh );



// Make a Moon.
// SphereGeometry(radius : Float, widthSegments : Integer, heightSegments : Integer, phiStart : Float, phiLength : Float, thetaStart : Float, thetaLength : Float)
var moonGeom = new THREE.SphereGeometry(100, 32, 16);
var moonTexture = new THREE.TextureLoader().load( './assets/moon.jpg' );
var moonMaterial = new THREE.MeshBasicMaterial( { map: moonTexture } );
var moon = new THREE.Mesh(moonGeom, moonMaterial);
moon.position.set(0,0,-150);
scene.add(moon);





// Moon glow
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
	
var moonGlow = new THREE.Mesh( moonGeom.clone(), customMaterial.clone() );
console.log(moonGlow, moon)
moonGlow.position.set(moon.position.x, moon.position.y, moon.position.z);
moonGlow.scale.multiplyScalar(1.2);
scene.add( moonGlow );









// renderer.domElement is created in renderer.
const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animation );
document.body.appendChild( renderer.domElement );


// CONTROLS
const controls = new OrbitControls( camera, renderer.domElement );
controls.addEventListener( 'change', render );
// console.log(THREE)


// LIGHT
/*
var light = new THREE.PointLight(0xffffff);
light.position.set(0,250,0);
scene.add(light);
*/




// ENVIRONMENT
// It's just a square within which the scene is set! So the images are set onto the square sides to make the 3D illusion.



// Animation
function animation( time ) {

	// The moon now rotates.
	// moon.rotation.x = time / 2000;
	// moon.rotation.y = time / 1000;
	

	render();
} // animation

function render(){	

	// The glow annotations can be part of an array?
	moonGlow.material.uniforms.viewVector.value = 
		new THREE.Vector3().subVectors( camera.position, moonGlow.position );

	
	renderer.render( scene, camera )
} //render






