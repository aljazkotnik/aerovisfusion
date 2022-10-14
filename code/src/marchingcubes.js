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

import ColorBar from "./GUI/ColorBar.js";
import {text2csv, csvStreamline2jsonStreamline} from "./helpers.js";

import isoSurface from "./components/isoSurface.js";


// Scene items
var camera, scene, light, renderer, controls;
var viewvec = new THREE.Vector3(0,0,-1);
const domainMidPoint = new THREE.Vector3(0.5, 100.5, 0);
const color = new THREE.Color();
const colorbar = new ColorBar(0.14, 0.44);



// Arrays holding hte items.
// var streamlines = [];
var lineShaderStreamlines = [];
var streamlinegeometry, streamlinematerial;



// Create a cyclic IntegrationTime clock - not cyclic before time should be linear;
// So instead there should be a remainder that gets transformed.
const t0 = performance.now();
const IntegrationSpan = [-0.009302791000000, 0.014919188];
const CycleDuration = 4*1e3; // [ms];

// Let's say that it should span the integration domain in
function CurrentIntegrationTime(){
	return ((performance.now() - t0) % CycleDuration)/CycleDuration
} // CurrentIntegrationTime


// I want time to run in ms, and the drawing should be updated based on that. On hte other hand the lines should actually be drawn at different times, to allow them to be offset in space. So I should keep the clock in the [0-1] cycle, and then convert the time for each line separately.





init();
animate();


function init() {


	

	setupScene();
	
	
	
	// Add the controls - change this to trackbal?
	addOrbitControls();
	// addTrackballControls();
	

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
	
	
	// Add in hte iso surface.
	let io = addIsoSurface();
	document.getElementById("GUI").appendChild(io.thresholdInput);
	
	
	console.log(scene)
	console.log(io)
	
	
	// Add the streamlines.
	// addShaderStreamlines();
	
	
	
	
	
	
	// Bringing this lookAt to the end fixed the camera misdirection initialisation.
	// With trackball controls lookAt no longer works.
	adjustView([0.43, 99, 1.2])

	window.addEventListener( 'resize', onWindowResize );
} // init



function setupScene(){
	
	/* SCENE, CAMERA, and LIGHT setup.
	camera inputs: view angle, aspect ratio, near, far.
	desired domain to show = x: [0, 0.6], y: [100, 100.4], z: [0, 0.25].
	*/
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	
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

function adjustView(position){
	// Is it the controls target that sets the view??
	controls.enabled = false;

	camera.position.set( position[0], position[1], position[2] );
	camera.lookAt( controls.target );

	controls.enabled = true;
} // adjustView

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
		mesh.name = "delta wing";
		
		scene.add( mesh );
	}) // Promise.all
	
	
} // addWingGeometry


function addIsoSurface(){
	
	// Maybe this data should be specified outside? Leave here for now.
	const path = "./assets/deltawing/block/";
	const c = fetch( path + "suction_side_block_connectivity.json").then(res=>res.json());
	const v = fetch( path + "suction_side_block_vertices.json").then(res=>res.json());
	const m = fetch( path + "suction_side_block_mach.json").then(res=>res.json());
	
	const loadDataPromise = Promise.all([ c,v,m ]).then( data=>{
		
		let mach = data[2];
		mach.domain = [Math.min.apply( null, mach ), Math.max.apply( null, mach )];
	
		return {
			connectivity: data[0],
			vertices: data[1],
			mach: mach
		};
	}) // Promise.all
	
	
	// Iso Surface is different to the wing because the user can interact with it.
	const isoobj = new isoSurface(loadDataPromise);
	
	isoobj.data.then(function(d){
		isoobj.mesh.name = "iso-surface";
		scene.add( isoobj.mesh );
	})


	return isoobj
	
	
} // addWingGeometry



// MeshLines seems to run ok with 5000 lines. Regular Lines also run fine with 5000 lines. Stick with that for now. Maybe some sort of routine to sample the lines?
// Well, how many points do we want? How random should they be? Fir


function addShaderStreamlines(){
	
	var vertexShader = `
      precision mediump float;
      precision mediump int;
      attribute vec4 color;
      varying vec4 vColor;
      void main()    {
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;
    var fragmentShader = `
      precision mediump float;
      precision mediump int;
      varying vec4 vColor;
      void main()    {
        vec4 color = vec4( vColor );
        gl_FragColor = color;
      }
    `;
	
	
	// STREAMLINES
	streamlinegeometry = new THREE.BufferGeometry();
	streamlinematerial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });
	// transparent: true,
    // depthTest: false,
	// blending: THREE.AdditiveBlending,
	
	
	
	// streamlinematerial = new THREE.LineBasicMaterial( { color: 0xff0000, dashSize: 3, gapSize: 1 } );
	
	fetch("./assets/deltawing/streamlines/streamlines_suction_side_min.csv")
	  .then(res=>res.text())
	  .then(t=>csvStreamline2jsonStreamline( text2csv(t) ))
	  .then(sa=>{
		  sa.forEach((s,i)=>{
			  // Interpolate using THREE.CatmullRomCurve3 to create more points?
			  
			// Limited to 5000 lines for performance.
			if(i<2000){
			  // addControlLine(s);
			  addShaderLine(s);
			} // if
		  }) // forEach
		  
		  // console.log(lineShaderStreamlines)
	  }) // then
} // addShaderStreamlines

function addShaderLine(points){
	
	// Convert the array of json objects into values for the float array.
	let times = [];
	let vals = [];
	let colors = [];
	points.forEach((p,i)=>{
		// Collect the points
		vals.push(p["Points:0"], p["Points:1"], p["Points:2"]);
		
		// Populate the colors. Maybe for now just create colors?
		color.set( colorbar.getColor( p["Mach"] ) );
		colors.push( color.r, color.g, color.b, 1 );
		
		// Populate the time.
		times.push( p["IntegrationTime"] );
	}) // forEach
	
	
	
	let positions = new Float32Array(vals);


	let geometry = streamlinegeometry.clone();   
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    // geometry.setDrawRange(0, 0);

	
	// Colors indicated the age of the line. Keep this for now.
    // var colors = new Array( points.length*4 ).fill(1);
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4, true));


    let line = new THREE.Line(geometry, streamlinematerial.clone());
	line.tOffset = Math.random()*CycleDuration;
	line.times = times.reverse(); // reverse so checking for last element under time.
  
    lineShaderStreamlines.push(line);
    scene.add(line)
} // addShaderLine

function updateShaderLine(t){
	// Fadeout was achieved by changing hte color on-the-go....
	// That was a lot of work being done all the time - constant traversal of the data, constant communication with the GPU...
	let L = 5;
	
	lineShaderStreamlines.forEach(line=>{
		// Even if I have the streamlines precomputed I still only move based on hte index position in hte array - still cannot simulate the actual velocity... Ok, but does it just advance to the point while keeping hte ones in hte back?
		
		// Don't increment every redraw, but instead find the index to the correct timestep. That should be the last timestep behind - always lagging a bit?
		// Even if the streamlines are recalculated to fit with the desired dt, the update still has to happen based on global time to avoid controls redrawing too fast.
		
		// This is the lagging cycling. For preceding cycling hte times reversal in line initialisation needs to be removed.
		
		// What to do when the reverse index isn't found? Then 0 should be output. Furthermore, stagger the indices by the random offset. But this offset should be in time!!
		
		let tOffset = (t + line.tOffset)%1*(IntegrationSpan[1]-IntegrationSpan[0]) + IntegrationSpan[0];
		
		// Age will always be > 0. t e[0,1], tOffset e[0,1]
		let revi = line.times.findIndex(function(v){return v <= tOffset});
		
	    
		/*
		Model it as the end of the line moving and dragging the lines behind itself?
		
		Either way you pay at one end. Or maybe 
		
		if 0 is the first index and 100 is the last index: 
		start = [0,0,0,0,0,0,1,2,3,4,5,...,95,96,97,98,99,100]
		count = [0,1,2,3,4,5,5,5,5,5,5,..., 5, 4, 3, 2, 1, 0]
		
		*/
		
		// It's forward drawing: start at i and draw n vertices;
		// Fade in: until age >= L, i=0, and n=age
		// Fade out: if age > maxAge, 
		
		// Implement the fadeout and fade in. fadeout is easy - just let the index go past the maximum. For fadeIn the 
		
		
		revi = revi < 0 ? 0 : line.times.length-1-revi;
		let start = Math.max(0, revi - 5);
		let count = revi-L < 0 ? start : (revi+5>line.times.length ? line.times.length-revi : 5 );
		
				
		line.geometry.setDrawRange( start, count)
		
		
	})
} // updateShaderLine


function addControlLine(points){
	// This is a line to show hte extent of the data.
	
	let positions = points.map(p=>{
		return new THREE.Vector3( p["Points:0"], p["Points:1"], p["Points:2"]+0.1)
	}); // reduce
	
	let geometry = new THREE.BufferGeometry();
	geometry.setFromPoints( positions );
	
	let material = new THREE.LineBasicMaterial( { color: 0xff00ff } );
	
	let line = new THREE.Line( geometry, material);
	
	scene.add(line)
} // addControlLine




// Make the colormap.






// CONTROLS
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
	// Shader line should update at 60fps at most.
	let t = CurrentIntegrationTime();
	updateShaderLine(t)

	renderer.render( scene, camera );
} // render




