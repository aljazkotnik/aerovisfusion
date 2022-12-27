/*
DONE: Load in the entire dataset.

Parse it as the server would to produce the `complex' data.
	There should be a delay when accessing non-transferred data. This should also show the rough data.
	
	Ok, so the main class should make a request for the data. In case that the data is not available yet it should display the rough dataset, wait for the data to be loaded, and then update the mesh appropriately. So maybe the rendering should be a subscriber here.
	
	Let's have an interval of threshold values set, and while staying within hte interval the full resolution set is shown. When moving ourside of the interval, the rough resolution is shown. Debounce just the changing of hte interval.


Make the low resoltuion and high resolution data available.
Perform the marching.
Pass the buffers to the appropriate threejs object for rendering
*/
import * as THREE from "three";
import { generateMeshVTK } from "./marching.js";
import IsoSurface from "./isoSurface.js";

export default class IsosurfaceServerProxy extends IsoSurface{
  
  fineResolutionTimer = undefined
  fineResolutionInterval = [0,0]
  
  
  constructor( configFilename,colorbar ){
	super(configFilename,colorbar)
    let obj = this;
	
	
	// Rough indices are sufficient to produce rough visualisation of meshes.
	obj.roughindices = makeRoughConnectivity(151, 40, 20, 2);
	
	
	
	
  } // constructor
  
  
  update(){
	let obj = this;
	
	// Update the mesh buffers. This generate mesh still works on i,j,k as the vertex coordinate values.
	Promise.all( [obj.dataPromise, obj.meshPromise] ).then(a=>{
		const d = a[0];
		const mesh = a[1];
		
		
		const drawFineResolution = (obj.threshold > obj.fineResolutionInterval[0]) && (obj.threshold < obj.fineResolutionInterval[1]);
		
		
		//The fine resolution interval should be updated even if the threshold stays within it after the interaction.
		// Every update of the threshold interval therefore shouldn't launch an update of the surface, otherwise there will be an endless loop of updates.
		if(!drawFineResolution){
			obj.updateFineResolutionData()
		} // if
		
		
		// Generate the surface using Thanassis code.
		const surface = generateMeshVTK({
			connectivity: drawFineResolution ? d.connectivity : obj.roughindices,
			vertices: d.vertices,
			mach: d.mach
		}, obj.config.threshold );
		
		
	
		/* This update here is quite wasteful, and should definitely be improved somehow.
		The issue is that the isosurface geometry will have a different number of triangles for different thresholds. This means that the buffer must in some cases be inreased after an interaction, but increasing buffers is not possible. Instead, a buffer large enough to store any size can be initiated, and updated, with the range of the buffer being used by the GPU limited.
		*/			
		const positions = Float32Array.from( surface.verts )
		const indices = Uint32Array.from( surface.indices )
		
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
		geometry.attributes.position.usage = THREE.DynamicDrawUsage;
		geometry.setIndex( new THREE.BufferAttribute( indices, 1) );
		geometry.computeVertexNormals();

		mesh.geometry.dispose();
		mesh.geometry = geometry;
		
		mesh.material.color.set( obj.colorbar.getColor( obj.threshold ) )
	}) // Promise.all
	
	
  } // update
  
  
  
  updateFineResolutionData(){
	let obj = this;
    clearTimeout( obj.fineResolutionTimer )
    obj.fineResolutionTimer = setTimeout(function(){
		// Change the fine resolution interval.
		obj.fineResolutionInterval = [obj.threshold - obj.step*10, obj.threshold + obj.step*10];
		
		// Launch an update to change the visualisation.
		obj.update();
	}, 2000)
  } // debounce
  
  
} // IsosurfaceServerProxy





function makeRoughConnectivity(nx, ny, nz, nb){
  // nx=151; ny=40; nz=20; nb=2
  
  // I need to group the cells together. The mesh does not necessarily support the division into groups of NxNxN cells naturally.
  // The division is done by constructing new indices, as opposed to collecting old indices, and using hteir components.
  // array([   0,    1, 6041, 6040,  151,  152, 6192, 6191])
  
  let nxny = nx*ny; // 6040
  let nxnynz = nx*ny*nz; // 120800
  
  let roughindices = [];
  const N = 3; // number of cells to be grouped.
  for(let b=0; b<nb; b++){
	// block
	let bi = b*nxnynz;
	
	// Loop throuh vertices (!). Now for every vertex asked the surrounding cell needs to be established.
	for(let ix=0; ix<151-N; ix+=N){
	  for(let iy=0; iy<40-N; iy+=N){
		for(let iz=0; iz<20-N; iz+=N){
		  // Is is the current vertex id used as the starting point to create the cube.
		  let i = ix + iy*nx + iz*nxny;
				
		  let i_cell = [
		    i, 
		    i+N*1, 
			i+N*nxny+N*1, 
			i+N*nxny, 
			i+N*nx, 
			i+N*nx+N*1, 
			i+N*nxny+N*nx+N*1, 
			i+N*nxny+N*nx
		  ];	
			
		  // Correct for hte block indices.
		  let i_block = i_cell.map(ci=>ci+bi)
			
		  // Store the new cell.
		  roughindices.push(i_block)
		} // for
	  } // for
	} // for
  };
  
  return roughindices
}; // makeRoughConnectivity