import * as THREE from "three";
import { generateMeshVTK } from "./marching.js";
import { trimStringToLength } from "../helpers.js";

export default class IsoSurface{
	
	a = 0
	b = 1
	step = 0.05
	value = 0
	
	constructor( configFilename ){
		let obj = this;
		
		
		obj.config = {
			visible: true,
			source: configFilename,
			threshold: 0.30545,
			remove: function(){}
		} // config
		
		
		obj.configPromise = fetch( configFilename )
		  .then(res=>res.json())


		obj.dataPromise = obj.configPromise.then(json=>{
			
			// Load the pressure surface. Encoding prescribed in Matlab. Float64 didn't render.
			let verticesPromise = fetch( json.vertices )
			  .then(res=>res.arrayBuffer())
			  .then(ab=>{return new Float32Array(ab)}); // float32
			let indicesPromise = fetch( json.indices )
			  .then(res=>res.arrayBuffer())
			  .then(ab=>{return new Uint32Array(ab)}); // uint32
			let valuePromise = fetch( json.values )
			  .then(res=>res.arrayBuffer())
			  .then(ab=>{return new Float32Array(ab)}); // float32
			  
			return Promise.all([verticesPromise, indicesPromise, valuePromise]).then(a=>{
				// Reformat the data to Thanassis' structure.
				obj.updateControlsToValuesRange(a[2]);
				
				
				// Connectivity is expected to be an array of arrays, with each sub-array representing a cube cell with 8 indices.
				let connectivity = bin2array(a[1], 8)
				
				
				// Vertices are expected to be an array of arrays, each sub-array representing a vertex with three components
				let vertices = bin2array(a[0], 3)
				
				
				return {
					connectivity: connectivity,
					vertices: vertices,
					mach: a[2]
				} // return
			}) // Promise.all
		}) // then
		
		
		obj.meshPromise = obj.dataPromise.then(d=>{
			
				
			// Calculate an isosurface using Thanassis' code.
			const surface = generateMeshVTK(d, obj.config.threshold );
			
			
			// Material.
			const material = new THREE.MeshBasicMaterial( { 
				color: 0xDCDCDC,
				side: THREE.DoubleSide
			} );
			
			// Geometry
			const positions = Float32Array.from( surface.verts )
			const indices = Uint32Array.from( surface.indices )
			
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ));
			geometry.attributes.position.usage = THREE.DynamicDrawUsage;
			geometry.setIndex( new THREE.BufferAttribute( indices, 1) );
			
			const mesh = new THREE.Mesh( geometry, material );
			mesh.name = obj.config.source;
			
			return mesh;
		}) // then
			  
	} // constructor
	
	get threshold(){
		// Default value is 0.
		let obj = this;
		return obj.config.threshold
	} // get threshold

	
	update(){
		let obj = this;
		// Update the mesh buffers. This generate mesh still works on i,j,k as the vertex coordinate values.
		Promise.all( [obj.dataPromise, obj.meshPromise] ).then(a=>{
			const d = a[0];
			const mesh = a[1];
			
			// Generate the surface using Thanassis code.
			const surface = generateMeshVTK( d, obj.config.threshold );
			
			
		
			/* This update here is quite wasteful, and should definitely be improved somehow.
			The issue is that the isosurface geometry will have a different number of triangles for different thresholds. This means that the buffer must in some cases be inreased after an interaction, but increasing buffers is not possible. Instead, a buffer large enough to store any size can be initiated, and updated, with the range of the buffer being used by the GPU limited.
			*/			
			const positions = Float32Array.from( surface.verts )
			const indices = Uint32Array.from( surface.indices )
			
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
			geometry.attributes.position.usage = THREE.DynamicDrawUsage;
			geometry.setIndex( new THREE.BufferAttribute( indices, 1) );
	
			mesh.geometry.dispose();
			mesh.geometry = geometry;
			
		}) // Promise.all
		
	} // update
	
	
	updateControlsToValuesRange(values){
		let obj = this;
		
		let a = parseFloat( Math.min.apply( null, values ).toPrecision(3) )
		let b = parseFloat( Math.max.apply( null, values ).toPrecision(3) )
		let step = (b-a)/100;
		
		obj.step = step;
		obj.a = a;
		obj.b = a+100*step;
		
		obj.config.threshold = (2*a + b)/3
				
		if(obj.gui){
			let tc = obj.gui.controllers.find(c=>c.property=="threshold");
			
			tc.min( obj.a )
			tc.max( obj.b )
			tc.step( obj.step )
			tc.setValue( obj.config.threshold )
		} // if
		
	} // updateControlsToValuesRange
	
	
	
	addTo(sceneWebGL){
		let obj = this;
		obj.meshPromise.then(mesh=>{
			sceneWebGL.add( mesh );
		}) // then
	} // addTo
	
	
	
	addGUI(elementsGUI){
		let obj = this;
		
		// Add GUI controllers.
		obj.gui = elementsGUI.addFolder( "Isosurface: " + trimStringToLength(obj.config.source, 27));
		
		obj.gui.add( obj.config, "visible" ).onChange(function(v){ obj.meshPromise.then(mesh=>{mesh.visible = v}) }); 	   // boolean
		obj.gui.add( obj.config, "threshold", obj.a, obj.b, obj.step ).onChange(function(v){obj.update() });	// slider
		
		obj.gui.add( obj.config, "remove" );      						// button
		
		
		
	} // addGUI
	
	
	
	
	
} // isoSurface







function bin2array(binarray, ncomp){
	let r = [];
	for(let i=0; i<binarray.length; i+=ncomp){
		let c = [];
		for(let j=0; j<ncomp; j++){
			c.push(binarray[i+j])
		} // for
		r.push(c)
	} // for
	return r
} // bin2array









