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

import {text2csv, csvStreamline2jsonStreamline} from "./helpers.js"
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from "three.meshline";

// Scene items
var camera, scene, light, renderer, controls;
var viewvec = new THREE.Vector3(0,0,-1);
const domainMidPoint = new THREE.Vector3(0.5, 100.5, 0);

// Arrays holding hte items.
var streamlines = [];
var streamlinegeometry, streamlinematerial;

var clock = new THREE.Clock();




init();
animate();


// renderer.setAnimationLoop( animate );





function init() {

	/*
	Play around with the positioning of the objects. Does the camera initially look at 0,0,0?
	
	
	*/

	

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
	
	
	
	// Add the controls - change this to trackbal?
	addOrbitControls();
	// addTrackballControls();
	
	
	// Data domain viewframe.
	// The box is positioned by its centerpoint.
	const box = new THREE.BoxGeometry( 1.4, 1, 2 );
	const object = new THREE.Mesh( box, new THREE.MeshBasicMaterial( { color: 0x0FC3D6, wireframe: true } ) );
	object.position.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
	scene.add( object );
	
	
	// Add in the wing.
	addWingGeometry()
	
	
	// Add the streamlines.
	addStreamlines();
	
	
	
	
	
	
	// Bringing this lookAt to the end fixed the camera misdirection initialisation.
	// With trackball controls lookAt no longer works.
	// console.log(scene, camera, object, viewvec)
	camera.lookAt( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )


	window.addEventListener( 'resize', onWindowResize );
} // init



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
		// create a simple square shape. We duplicate the top left and bottom right
		// vertices because each vertex needs to appear once per triangle.
		/*
		const vertices = new Float32Array( [
			domainMidPoint.x-1.0, domainMidPoint.y-1.0,  domainMidPoint.z+1.0,
			domainMidPoint.x+1.0, domainMidPoint.y-1.0,  domainMidPoint.z+1.0,
			domainMidPoint.x+1.0, domainMidPoint.y+1.0,  domainMidPoint.z+1.0,

			domainMidPoint.x+1.0, domainMidPoint.y+1.0,  domainMidPoint.z+1.0,
			domainMidPoint.x-1.0, domainMidPoint.y+1.0,  domainMidPoint.z+1.0,
			domainMidPoint.x-1.0, domainMidPoint.y-1.0,  domainMidPoint.z+1.0
		] );
		*/
		
		geometry.setAttribute( 'position', new THREE.BufferAttribute( a[0], 3 ) );
		geometry.setIndex( new THREE.BufferAttribute(a[1], 1) );
		const mesh = new THREE.Mesh( geometry, wingmaterial );
		
		
		scene.add( mesh );
	}) // Promise.all
	
	
} // addWingGeometry

function addStreamlines(){
	// STREAMLINES
	streamlinegeometry = new THREE.BufferGeometry();
	streamlinematerial = new THREE.LineDashedMaterial( { color: 0xff00ff, dashSize: 0.1, gapSize: 0.05 } );
	
	
	// streamlinematerial = new THREE.LineBasicMaterial( { color: 0xff0000, dashSize: 3, gapSize: 1 } );
	
	fetch("../data/streamlines/streamlines_suction_side_1000.csv")
	  .then(res=>res.text())
	  .then(t=>csvStreamline2jsonStreamline( text2csv(t) ))
	  .then(sa=>{
		  [sa[0]].forEach((s,i)=>{
			  // Interpolate using THREE.CatmullRomCurve3 to create more points?
			  
			// Limited to 5000 lines for performance.
			if(i<1000){
			  
			  let points = s.map(p=>{
				  return new THREE.Vector3( p["Points:0"], p["Points:1"], p["Points:2"] )
			  }) // points
			  
			 
			  let line = makeDashedLine(points)
			  let line2 = makeDashedLine2(points)
			  
			  scene.add( line );
			  scene.add( line2 );
			  streamlines.push( line2 )
			  
			} // if
		  }) // forEach
		  
		  console.log(streamlines)
	  }) // then
} // addStreamlines




function makeDashedLine(points){
	
	let geometry = streamlinegeometry.clone().setFromPoints( points );
	
	let line = new THREE.Line( geometry,  streamlinematerial);
	line.computeLineDistances();

	return line;	
} // addDashedLine



function makeDashedLine2(points){
	
	const geometry = new THREE.BufferGeometry().setFromPoints(points);
	
	const line = new MeshLine();
	line.setGeometry(geometry);
	
	const material = new MeshLineMaterial({
		dashArray: 0.1,
		lineWidth: 0.01
	});
	
	const mesh = new THREE.Mesh(line, material);
	
	return mesh
} // makeDashdLine2




// MeshLines seems to run ok with 5000 lines. Regular Lines also run fine with 5000 lines. Stick with that for now. Maybe some sort of routine to sample the lines?


// Well, how many points do we want? How random should they be? Fir







function updateStreamlets(){
	// It's a dashed line in 3d, and all we're doing is incrementing hte offset.
	streamlinematerial.current.uniforms.dashOffset.value -= 0.1;
} // updateStreamlets


// Lets first try to see if htey can be drawn using MeshLine instead of Line



function addOrbitControls(){
	controls = new OrbitControls( camera, renderer.domElement );
	controls.addEventListener( 'change', render );
	controls.target.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
} // addOrbitControls


function addTrackballControls(){
	controls = new TrackballControls( camera, renderer.domElement );

	controls.rotateSpeed = 1.0;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;
	
	// controls.addEventListener( 'change', render );
} // addTrackballControls



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




