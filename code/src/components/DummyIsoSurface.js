/*
This class adds some functionality to make plots for the AIAA paper without implementing Thanassis' full functionality.
*/
import * as THREE from "three";
import { generateMeshVTK } from "./marching.js";
import IsoSurface from "./IsoSurface.js"

export default class DummyIsoSurface extends IsoSurface {
  constructor( configFilename, colorbar ){
    super( configFilename, colorbar )
	let obj = this;
	
	// I need to group the cells together. The mesh does not necessarily support the division into groups of NxNxN cells naturally.
	// The division is done by constructing new indices, as opposed to collecting old indices, and using hteir components.
	// array([   0,    1, 6041, 6040,  151,  152, 6192, 6191])
	let roughindices = [];
	const N = 3; // number of cells to be grouped.
	for(let b=0; b<2; b++){
		// block
		let bi = b*120800;
		
		// Loop throuh vertices (!). Now for every vertex asked the surrounding cell needs to be established.
		for(let ix=0; ix<151-N; ix+=N){
			for(let iy=0; iy<40-N; iy+=N){
				for(let iz=0; iz<20-N; iz+=N){
					// Is is the current vertex id used as the starting point to create the cube.
					let i = ix + iy*151 + iz*6040;
					
					let i_cell = [
					  i, 
					  i+N*1, 
					  i+N*6040+N*1, 
					  i+N*6040, 
					  i+N*151, 
					  i+N*151+N*1, 
					  i+N*6040+N*151+N*1, 
					  i+N*6040+N*151
					]
					
					
					// Correct for hte block indices.
					let i_block = i_cell.map(ci=>ci+bi)
					
					// Store the new cell.
					roughindices.push(i_block)
				} // for
			} // for
		} // for
	};
	obj.roughindices = roughindices;
	
	
  } // constructor
  
  
  addTo(sceneWebGL){
		let obj = this;
		obj.meshPromise.then(mesh=>{
			sceneWebGL.add( mesh );
			
			
			var geo = new THREE.WireframeGeometry( mesh.geometry );

			/*
			var mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
			const wireframe = new THREE.LineSegments(geo, mat)
			obj.wireframe = wireframe;
			sceneWebGL.add( wireframe )
			*/
		}) // then
	} // addTo
  
  
  drawRough(){
	let obj = this;
	
	Promise.all( [obj.dataPromise, obj.meshPromise] ).then(a=>{
		const d = a[0];
		const mesh = a[1];
		
		
		// How to select every 4th cell in each direction? How to make 4x4x4 blocks in each direction? How is the indexing done?
		let roughData = {
			connectivity: obj.roughindices,
			vertices: d.vertices,
			mach: d.mach
		}
		
		
		// Generate the surface using Thanassis code.
		const surface = generateMeshVTK( roughData, obj.config.threshold );
		
		
	
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
	
  } // drawRough
  
  
  drawBlocks( connectivity ){
	  let obj = this;
	  // Draw blocks based on hte indices.
	  
	  
	  Promise.all( [obj.dataPromise, obj.meshPromise] ).then(a=>{
		const d = a[0];
		const mesh = a[1];
		
		let vertices = [];
		for(let i=0; i<d.vertices.length; i++){
			vertices.push(d.vertices[i][0], d.vertices[i][1], d.vertices[i][2])
		} // for
		  
		let colors = [];
		const cmin = obj.config.threshold - 0.05;
		const cmax = obj.config.threshold + 0.05;
		for(let i=0; i<d.mach.length; i++){
			let c = obj.colorbar.getColor( d.mach[i] )  //interpolateAlpha( (d.mach[i] - cmin)/(cmax-cmin) )
			colors.push(c.r, c.g, c.b)
		} // for
		  
		// Update the mesh to show these triangles
		const positions = Float32Array.from( vertices )
		const indices = Uint32Array.from( connectivity )
		
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
		geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		
		geometry.attributes.position.usage = THREE.DynamicDrawUsage;
		geometry.setIndex( new THREE.BufferAttribute( indices, 1) );
		geometry.computeVertexNormals();

		mesh.geometry.dispose();
		mesh.geometry = geometry;
		
		
		const material = new THREE.MeshLambertMaterial( {
			color: 0xF5F5F5,
			side: THREE.DoubleSide,
			vertexColors: true
		} );
		
		
		mesh.material.dispose()
		mesh.material = material;
		
		/*
		var geo = new THREE.WireframeGeometry( mesh.geometry );
		obj.wireframe.geometry.dispose();
		obj.wireframe.geometry = geo;
		*/
		  
	  }) // then	  
  } // drawBlocks
  
  
  drawMeshBlocks(){
	let obj = this;
	
	// Loop through the rough vertices and create the cell geometries as triangles.
	let cells = obj.roughindices.reduce((acc,cell)=>{
	  // cell is an array of 8 indices that should form a cell together.
	  pushCellTriangles(acc,cell)
	  return acc
	},[])
	
	obj.drawBlocks( cells );
	
  } // drawMeshBlocks
  
  
  drawThresholdBlocks(){
	// Draws the necessary threshold blocks to create the fine isosurface.
	let obj = this;
	  
	Promise.all( [obj.dataPromise, obj.meshPromise] ).then(a=>{
		const d = a[0];
		const mesh = a[1];
		
		
		let fine = obj.roughindices.reduce((acc, cell)=>{
			let someOver = cell.some(ci=>d.mach[ci] > obj.config.threshold-0.05);
			let someUnder = cell.some(ci=>d.mach[ci] < obj.config.threshold+0.05);
			
			if(someOver && someUnder){
				pushCellTriangles(acc, cell)
			} // if
			
			return acc
		},[])
		
		
		obj.drawBlocks( fine );
	})
	
  } // drawThresholdBlocks();
  
  
  
} // DummyIsoSurface



function pushCellTriangles(A, cell){
  // Make the triangles here. 2 for each cell face.
  A.push(cell[0], cell[1], cell[2])
  A.push(cell[0], cell[2], cell[3])
  
  A.push(cell[1], cell[5], cell[6])
  A.push(cell[1], cell[6], cell[2])
  
  A.push(cell[5], cell[4], cell[7])
  A.push(cell[5], cell[7], cell[6])
  
  A.push(cell[4], cell[0], cell[3])
  A.push(cell[4], cell[3], cell[7])
  
  A.push(cell[4], cell[5], cell[1])
  A.push(cell[4], cell[1], cell[0])
  
  A.push(cell[7], cell[6], cell[2])
  A.push(cell[7], cell[2], cell[3])
} // pushCellTriangles