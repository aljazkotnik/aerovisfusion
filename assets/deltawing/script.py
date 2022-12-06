# -*- coding: utf-8 -*-
"""
I want to be able to load in the vtu files created in Paraview and change them
to the appropriate json/bin files to be read in by the browser. Ultimately, 
this process should be translated to javascript, so that the files can be read
in directly.


IDEA: Setup a comparison config so that hte user can seamlessly move between
different design cases.

Could be an interesting navigation system - find all designs that are different
in at most one parameter, and allow the user to itneractively navigate to it.
Maybe even draw a map or something.


Created on Fri Nov 11 18:35:20 2022

@author: ak2164
"""


from vtk_to_tm3 import read_vtp_vtu
import numpy as np
import json

def getdomain(V):
    return [np.min(V).tolist(), np.max(V).tolist()]

def browserFilename(*args):
    return "./"+"/".join(["assets/deltawing"]+list(args))

def pythonFilename(*args):
    return "./" + "/".join(list(args))

def writeBinData(component, arrays):
    for a in arrays:
        np.array(a["data"]).astype(a["type"]).tofile( open( pythonFilename(task, component, a["name"]+".bin"),"w") )

def writeComponentFiles(componentname, binarrays, jsonconfig):
    writeBinData(componentname, binarrays)

    for a in binarrays:
        jsonconfig[a["name"]] = browserFilename(task, componentname, a["name"]+".bin")
    
    json.dump(jsonconfig, open( pythonFilename(task, componentname, "config.json") ,"w"),indent=0)








task = "mach_0p5_re_1e5_aoa_15_sweep_60_2500steps"





# WING
[nverts, ntris, vertices, indices, mach] = \
read_vtp_vtu( pythonFilename(task, "wing.vtu"), "Mach" )

# Reverse the order of the indices (!!) to see if it'll improve the surface normals.
v0 = indices[0::3]
v1 = indices[1::3]
v2 = indices[2::3]

c = np.empty((v0.size + v1.size + v2.size), dtype=indices.dtype)
c[0::3] = v2
c[1::3] = v1
c[2::3] = v0

indices = c


jsondict = {
"name": "Delta wing",
"domain": {
  "x": getdomain(vertices[0::3]),
  "y": getdomain(vertices[1::3]),
  "z": getdomain(vertices[2::3]),
  "mach": getdomain(mach),
}}

binarrays = [
      {"data": vertices, "type": "float32", "name": "vertices"},
      {"data": indices, "type": "int32", "name": "indices"},
      {"data": mach, "type": "float32", "name": "mach"}
]

writeComponentFiles("wing", binarrays, jsondict)




# STREAMLINES
from json2bin import streamlinesParaview2THREE
streamlines = streamlinesParaview2THREE( pythonFilename(task, "vortex_streamlines_5000.csv") )
json.dump(streamlines, open( pythonFilename(task, "streamlines", "vortex.json") ,"w"),indent=0)




# BLOCK
""" just load the block in, and then write the data out as it is, but in a bin
format """

"""
from vtk_to_tm3 import getDataArrayDataFromFilename

d = getDataArrayDataFromFilename( pythonFilename(task, "block.vtu") )
indices = [a for a in d if a['name']=="connectivity"][0]["data"]
vertices = [a for a in d if a['name']=="Points"][0]["data"]
mach = [a for a in d if a['name']=="Mach"][0]["data"]



binarrays = [
      {"data": vertices, "type": "float32", "name": "vertices"},
      {"data": indices, "type": "int32", "name": "indices"},
      {"data": mach, "type": "float32", "name": "mach"}
]

# writeComponentFiles("block", binarrays, {"name": "Isosurface"})



def bin2array(binarray, ncomp):
  r = [];
  i = 0
  while i < len(binarray):   
    c = [];
    for j in range(0, ncomp):
      c.append(binarray[i+j])
    
    r.append(c)
    i += ncomp
    
  return r

from functools import reduce

def factors(n):    
    return set(reduce(list.__add__, 
                ([i, n//i] for i in range(1, int(n**0.5) + 1) if n % i == 0)))

"""