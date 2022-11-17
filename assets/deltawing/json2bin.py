# -*- coding: utf-8 -*-
"""
Created on Thu Nov 17 16:12:45 2022

@author: ak2164
"""


"""
import json
import numpy as np

path = "C:\\Users\\ak2164\\Documents\\CAMBRIDGE\\PhD\\github_repos\\aerovisfusion\\assets\\deltawing\\block\\"

prop = "connectivity"
filein = "suction_side_block_"+prop+".json"
fileout = "suction_side_block_"+prop+".bin"

f = open( path+filein ,"r")
s = f.readlines()
d = np.array( json.loads("".join(s)) )


d.ravel().astype('int32').tofile( open( path+fileout,"w") )
"""



import csv
import json

def file2json( fullfilename ):
    data = []
    with open( fullfilename ) as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            r = {}
            for key in row.keys():
               r[key] = float(row[key])
            
            data.append(r)
    return data







def csvStreamline2jsonStreamline(c):
	  # c is just a table of points. One of the parameters is `IntegrationTime', 
    # and whenever it is 0 it indicates a separate integration effort. There are 
    # positive and negative times, so I think that's how the front integration is
    # separated from back integration. And the other file helps indicate which 
    # ones correspond to make a single line.
	
	  # The second thing that must happen is the stitching of streamlines together.
	  # ParaView streamlines were created using a seed sphere, within which points 
    # are randomly selected as start points. From the start points ParaView 
    # integrates along the velocity vector, and against the velocity to create 
    # streamlines. The along and against parts of the streamline are output as 
    # separate lines. These need to be stitched together.
	
	
	
    ind = -1;
    streamlines = [];
    seeds = [];
	
	  # We're banking on the fact that the first row starts with IntegrationTime=0;
	  # Bank on the fact that IntegrationTime can be used to order the points?
    for row in c:
          
        if(row["IntegrationTime"] == 0):
            # This is a new streamline segment. Check to see if the corresponding segment has already been identified. Just compare them as strings? See if that works?
            ident = ", ".join([str(v) for v in [row["Points:0"], row["Points:1"], row["Points:2"]]]);
            seedind = seeds.index(ident) if ident in seeds else -1;
            
            if(seedind < 0):
        				# Ok, make new streamline entry, and rebase ind to it.
                seeds.append(ident);
                streamlines.append([row]);
                ind = len(streamlines)-1;
            else:
                # Entry exists - rebase ind to it. Only branch where row does not get stored - it's the same as the first point of hte current streamline.
                ind = seedind;
        		 
        else:
        		 # This was separated out so that the seed point does not get repeated in hte data.
        		 streamlines[ind].append(row)
        		
		
		

	
    # Note that the seed point is registered twice in the streamlines array.
	
	
    # Now the streamline segments should have been stitched together, so the 
    # points onlyneed to be sorted according to the IntegrationTime.
    sorted_streamlines = [ sorted(s, key=lambda x: x["IntegrationTime"]) for s in streamlines ]
        
	
	
    # Ok - next task: we have the streamlines stitched together now, but we 
    # also want to interpolate them in time so that we can control the velocity 
    # with which we move along the line. Maybe calculate the average delta? But
    # the interpolation should be done outside sothat it can be dynamically 
    # recalculated if needed?
	
    # filter out any lines with less than 2 points.
    return [s for s in sorted_streamlines if len(s) > 1]
	



path = "C:\\Users\\ak2164\\Documents\\CAMBRIDGE\\PhD\\github_repos\\aerovisfusion\\assets\\deltawing\\streamlines\\"
filenamein = "streamlines_suction_side_min.csv"
filenameout = "streamlines_suction_side_min.json" 
data = file2json( path+filenamein )
streamlines = csvStreamline2jsonStreamline(data)

# And now, finally refactor the streamlines.
s_transformed = []
for s in streamlines:
    # I need .Points, .Values, and IntegrationTime
    points = []
    values = []
    times = []
    
    for p in s:
        points.append(p["Points:0"])
        points.append(p["Points:1"])
        points.append(p["Points:2"])

        values.append(p["Mach"])
        times.append(p["IntegrationTime"])

    s_transformed.append({
        "Points": points,
        "Values": values,
        "IntegrationTime": times
    })

json.dump(s_transformed, open(path+filenameout,"w"),indent=4)
