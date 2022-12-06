/*
A class that can be used to :
 1) convert linear range values into desired color values.
 2) create the colorbar to draw on the UI
 
For meshes the coloring works by creating the color array for each vertex - instead of creating a texture to be read from the buffer.
*/

import { Color, CanvasTexture } from "three";


export default class ColorBar{
  
  minV = 0
  maxV = 1
  
  // Some helper color objects.
  colorMin = new Color();
  colorMax = new Color();
  _colormap = ColorMapKeywords.rainbow;
  
  _ncolorbands = 20;
  thresholds = new Float32Array(255);
  
  subscribers = [];
  
  constructor(a,b){
    let obj = this;
	
	const canvas = document.createElement( 'canvas' );
	canvas.width = 10;
	canvas.height = 100;
    obj.canvas = canvas;	
	obj.ctx = canvas.getContext( '2d', {
		alpha: false
	} );
	
	
	
	// Setup the options.
	obj.uniforms = {
		u_colorbar: { type: "t", value: new CanvasTexture( canvas ) },
		u_thresholds: {value: obj.thresholds },
		u_n_thresholds: {value: obj.ncolorbands },
		u_isolines_flag: {value: false },
		u_contours_flag: {value: true }
	};
	
	
	
	
	
	// Set the range. This launches update in return.
	obj.range = [a,b];
	
	
  
	
  } // constructor
  
  
  
  update(){
	// General update.
	let obj = this;
	
	// Update the actual canvas.
	obj.updateCanvas();
	
	
	obj.updateThresholds();
	
	
	// Update teh uniforms set by the colorbar. 
	//The texture is updated automatically.
	// Thresholds also should be updated automatically no?
	obj.uniforms.u_n_thresholds.value = obj.ncolorbands;
	obj.uniforms.u_isolines_flag.value = false;
	obj.uniforms.u_contours_flag.value = true;
	
	
	// Update all subscribers with their provided functions.
	obj.subscribers.forEach(subscriber=>{
		let m = subscriber[0];
		let f = subscriber[1];
		f(m);
	})
  } // update
  
  
  updateThresholds(){
	  // Only the n-values that will be accessed by the shader need to be updated.
	  let obj = this;
	  for(let i=0; i<obj.ncolorbands; i++){
          obj.thresholds[i] = obj.minV + i*(obj.maxV-obj.minV)/obj.ncolorbands;
	  }
	  
	  obj.thresholds[253] = obj.minV;
	  obj.thresholds[254] = obj.maxV;
	  
  } // thresholds
  
  
  
  get range(){
	  let obj = this;
	  return [obj.minV, obj.maxV]
  }
  
  
  set range(r){
	  let obj = this;
	  obj.minV = r[0];
	  obj.maxV = r[1];
	  obj.update();
  } // set range
  
  
  
  get ncolorbands(){
	  let obj = this;
	  return obj._ncolorbands;
  } // ncolorbands
  
  set ncolorbands(n){
	  let obj = this;
	  // Max n_colorbands imposed - thresholds is preallocated as a Float32Array(255), and last two elements are reserved as the min and max of the value mapping.
	  obj._ncolorbands = n < 253 ? n : 253;
	  obj.update();
  } // ncolorbands
  
  
  
  get colormap(){
	  let obj = this;
	  return obj._colormap;
  } // get colormap
  
  set colormap(colormap){
	// The colormap is an array that stores colors at given indices. The array is created hre by interpolating between values given for individual colorbars.
	let obj = this;
	
	
	// Select the predefined values for the selected colormap. The values are an array of [value e[0,1], hex string] elements. Set how many colors from the colorbar should be sampled.
	obj._colormap = ColorMapKeywords[ colormap ] || ColorMapKeywords.rainbow;

	obj.update();
  } // set colormap
  
  
  
  interpolateAlpha(alpha){
	// given some alpha value [0,1], return the color corresponding to it based on the currently selected colormap.
	let obj = this;
	
	
	// Prevent alpha from being out of bounds.
	alpha = Math.min(alpha, obj.maxV)
	alpha = Math.max(alpha, obj.minV)
	
	// Now loop through the predefined colormap values and see where the alpha value sits.
	for(let j=0; j<obj._colormap.map.length-1; j ++ ){
	  // Check if alpha is within this predefined color band.
	  if( alpha>obj._colormap.map[ j ][ 0 ] && alpha<=obj._colormap.map[ j + 1 ][ 0 ] ) {

		const min = obj._colormap.map[ j ][ 0 ];
		const max = obj._colormap.map[ j+1 ][ 0 ];

		obj.colorMin.set( obj._colormap.map[ j   ][ 1 ] );
		obj.colorMax.set( obj._colormap.map[ j+1 ][ 1 ] );
		
		
		// Try to interpolate the colors as hex?
		return new Color().lerpColors( obj.colorMin, obj.colorMax, ( alpha-min ) / ( max-min ) );
	  } // if
	} // for
	
	return "incorrect input";
	
  } // interpolateAlpha
  
  
  getColor(v){
	let obj = this;
	return obj.interpolateAlpha( 1-(v-obj.minV)/(obj.maxV-obj.minV) );
  } // getColor
  
  
  


  updateCanvas(){
	let obj = this;

	// Loop over the canvas height to change the colors.
	obj.ctx.clearRect(0, 0, obj.canvas.width, obj.canvas.height);
	for(let i=1; i<obj.canvas.height; i++){
		
		const color = obj.interpolateAlpha( i/obj.canvas.height );
		
		obj.ctx.fillStyle = `rgb(${255*color.r},${255*color.g},${255*color.b})`;
		obj.ctx.fillRect(0,i,obj.canvas.width,1)
	} // for
	

  } // updateCanvas
  
  
} // ColorBar


/*
Colormaps can be obtained 

FROM MATPLOTLIB:

from matplotlib import all
cmap = cm.get_cmap('gist_earth', n_colors)

for i in range(cmap.N):
    rgba = cmap(i)
    # rgb2hex accepts rgb or rgba
    print(i, matplotlib.colors.rgb2hex(rgba))



OR FROM D3

<script type="module">

	import {interpolateSpectral} from "https://cdn.skypack.dev/d3-scale-chromatic@3";


	// Get the colors out now.
	let n = 5;
	let colors = []
	let hex = []
	for(let i=0; i<n; i++){
		let rgbString = interpolateSpectral(i/(n-1));
		let rgbValues = rgbString.match(/\d+/g).map(s=>parseInt(s))
		colors.push( rgbValues )
		
		let hexValues = rgbValues.map(function(v){             //For each array element
			let s = v.toString(16);      	   //Convert to a base16 string
			return (s.length==1) ? "0"+s : s;  //Add zero if we get only one character
		})
		hex.push( [i/(n-1), "0x"+hexValues.join("")] );
	}
	
	
	console.log(colors, hex)
	
</script>

*/

const ColorMapKeywords = {
rainbow: {
	name: "rainbow", 
	map: [[0.0, 0x0000FF], 
		  [0.2, 0x00FFFF], 
		  [0.5, 0x00FF00], 
		  [0.8, 0xFFFF00], 
		  [1.0, 0xFF0000]] 
},

cooltowarm: {name: "cooltowarm", map: [[0.0, 0x3C4EC2], 
[0.2, 0x9BBCFF], 
[0.5, 0xDCDCDC], 
[0.8, 0xF6A385], 
[1.0, 0xB40426]] },

blackbody: {name: "blackbody", map: [[0.0, 0x000000], 
[0.2, 0x780000], 
[0.5, 0xE63200], 
[0.8, 0xFFFF00], 
[1.0, 0xFFFFFF]] },

grayscale: {name: "grayscale", map: [[0.0, 0x000000], 
[0.2, 0x404040], 
[0.5, 0x7F7F80], 
[0.8, 0xBFBFBF], 
[1.0, 0xFFFFFF]] },

gist_earth: {name: "gist_earth", map: [[0.0, 0x000000], 
[0.2, 0x225e7c], 
[0.5, 0x5da04b], 
[0.8, 0xc4a46f], 
[1.0, 0xfdfbfb]] },

gist_ncar: {name: "gist_ncar", map: [[ 0.0 , 0x000080 ],
[ 0.05263157894736842 , 0x005c0d ],
[ 0.10526315789473684 , 0x0001ec ],
[ 0.15789473684210525 , 0x00baff ],
[ 0.21052631578947367 , 0x00f9f4 ],
[ 0.2631578947368421 , 0x00fa9b ],
[ 0.3157894736842105 , 0x0aff0f ],
[ 0.3684210526315789 , 0x5fce00 ],
[ 0.42105263157894735 , 0x7efa05 ],
[ 0.47368421052631576 , 0xbaff3b ],
[ 0.5263157894736842 , 0xf7fc07 ],
[ 0.5789473684210527 , 0xffdb00 ],
[ 0.631578947368421 , 0xffba0e ],
[ 0.6842105263157895 , 0xff4c01 ],
[ 0.7368421052631579 , 0xff0a00 ],
[ 0.7894736842105263 , 0xff00ec ],
[ 0.8421052631578947 , 0xa72cff ],
[ 0.8947368421052632 , 0xe77bef ],
[ 0.9473684210526315 , 0xf4baf6 ],
[ 1.0 , 0xfef8fe ]] },

YlOrBr: {name: "YlOrBr", map: [[ 0.0 , 0xffffe5 ],
[ 0.05263157894736842 , 0xfffcd4 ],
[ 0.10526315789473684 , 0xfff8c2 ],
[ 0.15789473684210525 , 0xfff2b1 ],
[ 0.21052631578947367 , 0xfee99f ],
[ 0.2631578947368421 , 0xfee08a ],
[ 0.3157894736842105 , 0xfed36e ],
[ 0.3684210526315789 , 0xfec652 ],
[ 0.42105263157894735 , 0xfeb441 ],
[ 0.47368421052631576 , 0xfea231 ],
[ 0.5263157894736842 , 0xfa9025 ],
[ 0.5789473684210527 , 0xf37f1c ],
[ 0.631578947368421 , 0xea6e13 ],
[ 0.6842105263157895 , 0xdd5f0b ],
[ 0.7368421052631579 , 0xcf5004 ],
[ 0.7894736842105263 , 0xbc4403 ],
[ 0.8421052631578947 , 0xa63a03 ],
[ 0.8947368421052632 , 0x913204 ],
[ 0.9473684210526315 , 0x7b2b05 ],
[ 1.0 , 0x662506 ]] },

Spectral: {name: "Spectral", map: [[ 0.0 , 0x9e0142 ],
[ 0.05263157894736842 , 0xbb2149 ],
[ 0.10526315789473684 , 0xd7404e ],
[ 0.15789473684210525 , 0xe75948 ],
[ 0.21052631578947367 , 0xf57446 ],
[ 0.2631578947368421 , 0xfa9656 ],
[ 0.3157894736842105 , 0xfdb668 ],
[ 0.3684210526315789 , 0xfed07e ],
[ 0.42105263157894735 , 0xfee796 ],
[ 0.47368421052631576 , 0xfff7b1 ],
[ 0.5263157894736842 , 0xf8fcb5 ],
[ 0.5789473684210527 , 0xebf7a0 ],
[ 0.631578947368421 , 0xd3ed9c ],
[ 0.6842105263157895 , 0xb4e1a2 ],
[ 0.7368421052631579 , 0x92d3a4 ],
[ 0.7894736842105263 , 0x6dc5a5 ],
[ 0.8421052631578947 , 0x50aaaf ],
[ 0.8947368421052632 , 0x358bbc ],
[ 0.9473684210526315 , 0x476db0 ],
[ 1.0 , 0x5e4fa2 ]] },

d3Spectral: {name: "d3Spectral", map: [[0, 0x5e4fa2 ],
    [0.25, 0x89cfa5 ],
    [0.5, 0xfbf8b0],
    [0.75, 0xf88e53],
    [1, 0x9e0142]] },
	
d3CubehelixDefault: {name: "d3CubehelixDefault", map: [[0, 0x000000],
    [0.25, 0x16534c],
    [0.5, 0xa07949],
    [0.75, 0xc7b3ed],
	[1, 0xffffff]] }

}


