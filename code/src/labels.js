/*
Drawing the delta wing in THREE.js

WING GEOMETRY

MISSING: wing geometry definition pipeline
The wing geometry was manually extracted from the grid data using ParaView. The wing data is in the vtk format because THREE.js supports a VTKLoader.




STREAMLINES

With statically drawn streamlines as the number of lines increases occlusion prevents the user from seeing the flow feature. The streamlets allow the features to be visible.

Maybe it's easier to just precompute streamlines and store that data to be used in the visualisation?

A Gaussian process regression model could be used to select some sampling points, e.g. 1000 of them, and these can be used as the seed points?

- convertpoints to lines
- check how many lines work smoothly
- update the line data on-the-go
- make the update on the GPU
- adapt for CFD data




The particle stepping approach works by finding the relevant velocity for each point the particle takes. For large grids this is slow. Octtrees can be used to reduce the search time, but still. This is similar to how streamlines are calculated in hte first place.

Another option is to precalculate hte lines, and then just move particles along those lines.




The CFD domain is essentially a box. The streamlines cannot intersect with the wing. So the particles only need to check whether they are within hte domain bounding box or not.

Other approach is the Octtree. this would be required for internal passages. No - not even there, the particles would never leave the domain anyway - they just follow the closest point. Provided that their velocity is low enough that they don't overshoot any nodes.

*/



import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";


import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";



// Scene items
var camera, scene, light, renderer, controls;
var viewvec = new THREE.Vector3(0,0,-1);
const domainMidPoint = new THREE.Vector3(0.5, 100.5, 0);



// SETUP THE GEOMETRY AND INTERSECT ITEMS.
let mesh;
let raycaster;
let line;
let moved;

const intersection = {
	intersects: false,
	point: new THREE.Vector3(),
	normal: new THREE.Vector3()
};
const mouse = new THREE.Vector2();
const intersects = []; // array that stores found intersects.

const textureLoader = new THREE.TextureLoader();
const decalDiffuse = textureLoader.load( 'assets/oil_flow.png' );
// const decalNormal = textureLoader.load( 'textures/decal/decal-normal.jpg' );

const decalMaterial = new THREE.MeshPhongMaterial( {
	specular: 0x444444,
	map: decalDiffuse,
	normalScale: new THREE.Vector2( 1, 1 ),
	shininess: 30,
	transparent: true,
	depthTest: true,
	depthWrite: false,
	polygonOffset: true,
	polygonOffsetFactor: - 4,
	wireframe: false
} );


const decals = [];
let decalOrientationHelper;
const position = new THREE.Vector3();
const orientation = new THREE.Euler();
const size = new THREE.Vector3( 10, 10, 10 );


// Parameters from the UI - repackage into class?
const params = {
	minScale: 0.10,
	maxScale: 0.20,
	rotate: true,
	clear: function () {
		removeDecals();
	}
};






init();
animate();


function init() {


	// FOUNDATIONS
	setupScene();
	addOrbitControls();
	
	
	// GEOMETRY
	// Data domain viewframe.
	// The box is positioned by its centerpoint.
	/*
	const box = new THREE.BoxGeometry( 1.4, 1, 2 );
	const object = new THREE.Mesh( box, new THREE.MeshBasicMaterial( { color: 0x0FC3D6, wireframe: true } ) );
	object.position.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
	scene.add( object );
	*/
	
	// Add in the wing.
	addWingGeometry()
	
	
	
	// RAYCASTER
	
	const geometry = new THREE.BufferGeometry();
	geometry.setFromPoints( [ new THREE.Vector3(0.367, 100, 0.126), new THREE.Vector3(0.384, 100, 0.173) ] );

	line = new THREE.Line( geometry, new THREE.LineBasicMaterial() );
	scene.add( line );
	console.log(line)
	
	raycaster = new THREE.Raycaster();

	// mouse helper helps orinetate the decal onto the suface.
	decalOrientationHelper = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 10 ), new THREE.MeshNormalMaterial() );
	decalOrientationHelper.visible = false;
	scene.add( decalOrientationHelper );
	
	
	
	// Create the raycaster.
	/*
	BEHAVIOR:
	- click and drag should support OrbitControls without pasting the decal.
	- so store moved as before, and only past on pointerup?
	*/
	
	controls.addEventListener( 'change', function (){
	  moved = true;
	}); // change

	window.addEventListener( 'pointerdown', function (){
	  moved = false;
	}); // pointerdown

	window.addEventListener( 'pointerup', function (event){
	  // This registeres when the user clicked.
	  if ( moved === false ) {
		checkIntersection( event.clientX, event.clientY );
		if ( intersection.intersects ){
			shoot();
		};
	  } // if
	}); // pointerup
	

	// For now just focus on adding the pointer helper.
	window.addEventListener( 'pointermove', function (event){
	  checkIntersection( event.clientX, event.clientY )
	}); // onPointerMove
	
	
	
	
	
	
	
	
	
	// Bringing this lookAt to the end fixed the camera misdirection initialisation.
	// With trackball controls lookAt no longer works.
	// console.log(scene, camera, object, viewvec)
	camera.lookAt( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )


	window.addEventListener( 'resize', onWindowResize );
} // init


function shoot() {

	position.copy( intersection.point );
	orientation.copy( decalOrientationHelper.rotation ); // decalOrientationHelper!!!

	if ( params.rotate ) orientation.z = Math.random() * 2 * Math.PI;

	const scale = params.minScale + Math.random() * ( params.maxScale - params.minScale );
	size.set( scale, scale, scale );

	const material = decalMaterial.clone();
	material.color.setHex( Math.random() * 0xffffff );

	const m = new THREE.Mesh( new DecalGeometry( mesh, position, orientation, size ), material );

	decals.push( m );
	scene.add( m );

} // shoot

function removeDecals() {

	decals.forEach( function ( d ) {

		scene.remove( d );

	} );

	decals.length = 0;

}; // removeDecals


function checkIntersection( x, y ) {

	if ( mesh === undefined ) return;

	mouse.x = ( x / window.innerWidth ) * 2 - 1;
	mouse.y = - ( y / window.innerHeight ) * 2 + 1;

	raycaster.setFromCamera( mouse, camera );
	raycaster.intersectObject( mesh, false, intersects );

	
	if ( intersects.length > 0 ) {
		// Intersect point is the first point of the aimer line.
		const p = intersects[ 0 ].point;
		
		// The normal gets transformed into the second point here.
		const n = intersects[ 0 ].face.normal.clone();
		n.multiplyScalar( 0.1 );
		n.add( intersects[ 0 ].point );
		
		
		// Set the aiming line vertices.
		const positions = line.geometry.attributes.position;
		positions.setXYZ( 0, p.x, p.y, p.z );
		positions.setXYZ( 1, n.x, n.y, n.z );
		positions.needsUpdate = true;


		// Why does `intersection' need to be updated?
		intersection.point.copy( p );
		intersection.normal.copy( intersects[ 0 ].face.normal );
		intersection.intersects = true;

		// Intersects is the initialised array of intersects.
		intersects.length = 0;
		
		
		// Reposition hte helper.
		decalOrientationHelper.position.copy( p );
		decalOrientationHelper.lookAt( n );
		
		
	} else {
		intersection.intersects = false;
	} // if
} // checkIntersection




function setupScene(){
	
		/* SCENE, CAMERA, and LIGHT setup.
	camera inputs: view angle, aspect ratio, near, far.
	desired domain to show = x: [0, 0.6], y: [100, 100.4], z: [0, 0.25].
	*/
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	camera.position.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z -1 );
	
	
	scene = new THREE.Scene();

	// With the normal material the light is not needed - but will be needed later.
	light = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.set( 1, 1, 1 ).normalize();
	scene.add( light );
	
	
	// SETUP THE ACTUAL LOOP
	// renderer.domElement is created in renderer.
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	// renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );
	

	
	
	
} // setupScene


function addWingGeometry(){
	const wingmaterial = new THREE.MeshBasicMaterial( { color: 0x0FC3D6 } );
	wingmaterial.side = THREE.DoubleSide;
	
	// Load the pressure surface. Encoding prescribed in Matlab. Float64 didn't render.
	let verticesPromise = fetch("./data/wing/vertices.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Float32Array(ab)}); // float32
	let indicesPromise = fetch("./data/wing/indices.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Uint32Array(ab)}); // uint32
	
	Promise.all([verticesPromise, indicesPromise]).then(a=>{
		
		
		
		
		
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.BufferAttribute( a[0], 3 ) );
		geometry.setIndex( new THREE.BufferAttribute(a[1], 1) );
		geometry.computeVertexNormals();
		
		
		
		mesh = new THREE.Mesh( geometry, wingmaterial );
		
		
		scene.add( mesh );
	}) // Promise.all
	
	
} // addWingGeometry






// CONTROLS
function addOrbitControls(){
	controls = new OrbitControls( camera, renderer.domElement );
	controls.addEventListener( 'change', render );
	controls.target.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
} // addOrbitControls



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

function render() {	
	renderer.render( scene, camera );
} // render




