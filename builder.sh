: "${MEL_BUILD_DIR:=/media/ramdisk/melody-build}"

do_copy_build_files() {
  cp -r ./build/*[html] $MEL_BUILD_DIR
  rm -rf $MEL_BUILD_DIR/lib
  cp -r ./lib $MEL_BUILD_DIR/lib
}

do_fix_imports() {
  imports_scope=$1
  fixin_dir="build-$imports_scope"

  backtodir=$(pwd)
  cd $MEL_BUILD_DIR
  echo -e $(for ln in $(find $fixin_dir | sort -d | grep -P '(?<!\.d)\.js$')
  do
    printf "import './%s';\\\n" $ln
  done) > $MEL_BUILD_DIR/index-$imports_scope.js
  cd $backtodir
  npx fix-esm-import-path $MEL_BUILD_DIR/$fixin_dir/*
}

do_build_demo() {
  npm run build -- --outdir="$MEL_BUILD_DIR/build-demo"

  do_copy_build_files

  do_fix_imports 'demo'

  npx esbuild "$MEL_BUILD_DIR/index-demo.js" --bundle --minify --outfile="$MEL_BUILD_DIR/melody-min.js"
}

do_build_tests() {
  TEST_FILES=$(find tests/ -type f | grep -P '(?<!\.d)\.ts$' | tr '\n' ' ')
  npm run build -- $TEST_FILES --outdir="$MEL_BUILD_DIR/build-tests" 

  do_copy_build_files

  do_fix_imports 'tests'

  backtodir=$(pwd)
  cd $MEL_BUILD_DIR
  cat $MEL_BUILD_DIR/index-tests.js | npx esbuild --bundle --outfile=$MEL_BUILD_DIR/tests.js
  cd $backtodir
}

echo "Building to '${MEL_BUILD_DIR}' directoy..."
if [[ $PURPOSE == 'test' ]]; then
  npx tsc --outDir $MEL_BUILD_DIR/build-ts && do_build_tests && echo 'Tests built successfully!'
elif [[ $PURPOSE == 'demo' ]]; then
  do_build_demo && echo 'Demo built successfully!'
else
  echo 'must pass a valid PURPOSE'
fi
