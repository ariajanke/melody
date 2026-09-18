# Melody Programming Language
Melody is a simple WASM compiled language.

## Building/Demo
BASH/Linux/Node.js support only for now.

To build, run the following. Replace the directory values below with ones that will work for you, on your machine. Make sure you have node version 24.19.0 available and selected before starting.
```BASH
npm install
export MEL_BUILD_DIR=/your/build/dir
PURPOSE=demo ./builder.sh
cd $MEL_BUILD_DIR
python3 -m http.server
```
After that you should be able to navigate to localhost and open the demo page from the file index.

## Note on AI generated code
Earlier iterations of the project may have involved some of my own prelimary attempts to use AI SWE. Presently (as of 2026-09-21), this repository contains to the best of my knowledge only hand/human written code. Given what this project means to me (a sort of "passion project"), I will commit to only writting code by hand for this project from this point onward. Additionally contributions are accepted by *invite only*.
