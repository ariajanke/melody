MEL_BUILD_DIR="/media/ramdisk/melody-build"
TEST_FILES=$(find tests/ -type f | grep -P '(?<!\.d)\.ts$' | tr '\n' ' ')

do_build() {
  npm run buildn --melbuilddir=$MEL_BUILD_DIR --testsfiles="$TEST_FILES"
  cp -r ./build/*[html] $MEL_BUILD_DIR
  rm -rf $MEL_BUILD_DIR/lib
  cp -r ./lib $MEL_BUILD_DIR/lib

  backtodir=$(pwd)
  cd $MEL_BUILD_DIR
  echo -e $(for ln in $(find build-es | sort -d | grep -P '(?<!\.d)\.js$')
  do
    printf "import './%s';\\\n" $ln
  done) > $MEL_BUILD_DIR/index.js
  sed -i 's/    /\t/g' $(find build-ts | grep 'js$')
  cat $MEL_BUILD_DIR/index.js | npx esbuild --bundle --outfile=$MEL_BUILD_DIR/tests.js
  cd $backtodir

  npx fix-esm-import-path $MEL_BUILD_DIR/build-es/*
}

npx tsc && do_build && echo 'Build success!'
