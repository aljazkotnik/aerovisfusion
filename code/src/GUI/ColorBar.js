/*
A class that can be used to :
 1) convert linear range values into desired color values.
 2) create the colorbar to draw on the UI
 
For meshes the coloring works by creating the color array for each vertex - instead of creating a texture to be read from the buffer.
*/

import { Color } from "three";


export default class ColorBar{
  
  minV = 0
  maxV = 1
  
  constructor(a,b){
    let obj = this;
	
	obj.minV = a ? a : obj.minV;
	obj.maxV = b ? b : obj.maxV;
	
    obj.setColormap("rainbow", 20);
  } // constructor
  
  getColor(alpha){
	// Convert alpha into a colormap index.
	let obj = this;
	
	// Make sure that alpha is in the available range.
	let a = alpha;
	a = a <= obj.minV ? obj.minV : a;
	a = a >= obj.maxV ? obj.maxV : a;

	let f = ( a - obj.minV ) / ( obj.maxV - obj.minV );
	let colorPosition = Math.round( f * obj.lut.length );
		
	return obj.lut[ colorPosition ];
  } // getColor
  
  setColormap(colormap, ncolorbands){
	// The colormap is an array that stores colors at given indices. The array is created hre by interpolating between values given for individual colorbars.
	let obj = this;
	
	// Select the predefined values for the selected colormap. The values are an array of [value e[0,1], hex string] elements.
	obj.map = ColorMapKeywords[ colormap ] || ColorMapKeywords.rainbow;
	obj.lut = [];
	
	// So what does this do?
	const step = 1.0 / ncolorbands;
	

	// sample at 0
	obj.lut.push( obj.map[ 0 ][ 1 ] );

	// sample at 1/n, ..., (n-1)/n
	for( let i=1; i<ncolorbands; i++ ){
		// Interpolate between the value-hex combinatons to create new colors. Alpha tells us where on the value domain [0,1] we are sampling.
		let alpha = i*step;

		// Now loop through the predefined colormap values and see where the alpha value sits.
		for(let j=0; j<obj.map.length-1; j ++ ){
		  // Check if alpha is within this predefined color band.
		  if( alpha>obj.map[ j ][ 0 ] && alpha<=obj.map[ j + 1 ][ 0 ] ) {

			let min = obj.map[ j ][ 0 ];
			let max = obj.map[ j+1 ][ 0 ];

			let minc = new Color( obj.map[ j ][ 1 ] );
			let maxc = new Color( obj.map[ j+1 ][ 1 ] );
			
			// Try to interpolate the colors as hex?
			const color = new Color().lerpColors( minc, maxc, ( alpha-min ) / ( max-min ) );

			obj.lut.push( color );
		  }; // if
		}; // for i
	}; // for

	// sample at 1
	obj.lut.push( obj.map[ obj.map.length-1 ][ 1 ] );
	
	
  } // setColormap
} // ColorBar


/*
Colormaps can be obtained from matplotlib:

from matplotlib import all
cmap = cm.get_cmap('gist_earth', n_colors)

for i in range(cmap.N):
    rgba = cmap(i)
    # rgb2hex accepts rgb or rgba
    print(i, matplotlib.colors.rgb2hex(rgba))

*/

const ColorMapKeywords = {
rainbow: [[0.0, 0x0000FF], [0.2, 0x00FFFF], [0.5, 0x00FF00], [0.8, 0xFFFF00], [1.0, 0xFF0000]],
cooltowarm: [[0.0, 0x3C4EC2], [0.2, 0x9BBCFF], [0.5, 0xDCDCDC], [0.8, 0xF6A385], [1.0, 0xB40426]],
blackbody: [[0.0, 0x000000], [0.2, 0x780000], [0.5, 0xE63200], [0.8, 0xFFFF00], [1.0, 0xFFFFFF]],
grayscale: [[0.0, 0x000000], [0.2, 0x404040], [0.5, 0x7F7F80], [0.8, 0xBFBFBF], [1.0, 0xFFFFFF]],

gist_earth: [[0.0, 0x000000], [0.2, 0x225e7c], [0.5, 0x5da04b], [0.8, 0xc4a46f], [1.0, 0xfdfbfb]]
};