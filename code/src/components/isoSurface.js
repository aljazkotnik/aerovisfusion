import * as THREE from "three";
import { generateMeshVTK } from "./marching.js";


export default class isoSurface{
	
	data
	thresholdInput
	mesh
	
	constructor(loadDataPromise){
		let obj = this;
		
		
		
		
		// First create teh UI element
		obj.thresholdInput = document.createElement("input");
		obj.thresholdInput.type = "range";
		
		obj.thresholdInput.min = 0;
		obj.thresholdInput.max = 1;
		obj.thresholdInput.step = 0.05;
		obj.thresholdInput.value = 0;
		
		// How to load in actual data now. 
		
		/* 
		loadDataPromise expects to receive d = {
			connectivity: data[0],
			vertices: data[1],
			mach: mach
		};
		*/
		obj.data = loadDataPromise.then(function(d){
			
			// Rebase the UI element.
			// This is a botch here to get nice numbers!!
			let a = Math.floor(d.mach.domain[0]*1000)/1000;
			let b = Math.ceil(d.mach.domain[1]*1000)/1000;
			
			let step = (b-a)/100;
			obj.thresholdInput.step = step;
			obj.thresholdInput.min = a;
			obj.thresholdInput.max = a+100*step;
			
			obj.thresholdInput.value = 0.30545;
			
			
			const surface = generateMeshVTK( d, 0.3 );
			
			const material = new THREE.MeshBasicMaterial( { color: 0xDCDCDC } ); // gainsboro
			material.side = THREE.DoubleSide;
			
			const geometry = new THREE.BufferGeometry();
			
			
			// const MAX_POINTS = 30000;
			// const positions = new Float32Array( MAX_POINTS * 3 ); // 3 vertices per point
			const positions = Float32Array.from( surface.verts )
			geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
			geometry.attributes.position.usage = THREE.DynamicDrawUsage;
			
			
			const indices = Uint32Array.from( surface.indices )
			geometry.setIndex( new THREE.BufferAttribute( indices, 1) );
			
			obj.mesh = new THREE.Mesh( geometry, material );
			
			return d;
		});
		
		
		
		obj.thresholdInput.oninput = function() {
			obj.update();
		}
		
	} // constructor
	
	get threshold(){
		// Default value is 0.
		let obj = this;
		let t = parseFloat( obj.thresholdInput.value )
		return t ? t : 0;
	}

	
	update(){
		let obj = this;
		// Update the mesh buffers. This generate mesh still works on i,j,k as the vertex coordinate values.
		obj.data.then(function(d){
			
			
			// Generate the surface using Thanassis code.
			const surface = generateMeshVTK( d, obj.threshold );
			
			
			
			
			
			/* This update here is quite wasteful, and should definitely be improved somehow.
			The issue is that the isosurface geometry will have a different number of triangles for different thresholds. This means that the buffer must in some cases be inreased after an interaction, but increasing buffers is not possible. Instead, a buffer large enough to store any size can be initiated, and updated, with the range of the buffer being used by the GPU limited.
			*/
			const geometry = new THREE.BufferGeometry();
			
			
			// const MAX_POINTS = 30000;
			// const positions = new Float32Array( MAX_POINTS * 3 ); // 3 vertices per point
			const positions = Float32Array.from( surface.verts )
			geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
			geometry.attributes.position.usage = THREE.DynamicDrawUsage;
			
			
			const indices = Uint32Array.from( surface.indices )
			geometry.setIndex( new THREE.BufferAttribute( indices, 1) );
	
			obj.mesh.geometry.dispose();
			obj.mesh.geometry = geometry;
			
		
		}) // then
	} // update
	
} // isoSurface