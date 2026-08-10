# Melody Programming Language
Melody is a simple WASM compiled language. It's written mostly from scratch in TypeScript.

Declaration types are inferred by the RHS value's type. Right now it is incredibly simple. It can support some numeric operations, functions, and variable captures. All functions take no parameters, and return nothing.

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
