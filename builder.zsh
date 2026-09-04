MEL_BUILD_DIR=$(mktemp -d)"/melody-build"
# actual fucking black magic

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
  find $fixin_dir -type f -name '*.js' ! -name '*.d.js' | sort | while IFS= read -r ln; do
    printf "import '%s';\n" "./$ln"
  done > $MEL_BUILD_DIR/index-$imports_scope.js
  
  cd $backtodir
  echo 'fixing import paths'
  npx fix-esm-import-path $MEL_BUILD_DIR/$fixin_dir/* # --prefix $MEL_BUILD_DIR
}

do_build_tests() {
  TEST_FILES=$(find tests/ -type f | perl -nle 'print if /\.ts$/ && !/\.d\.ts$/')
  npm run build -- $TEST_FILES --outdir="$MEL_BUILD_DIR/build-tests"

  do_copy_build_files

  do_fix_imports 'tests'

  backtodir=$(pwd)
  # cd $MEL_BUILD_DIR
  find $MEL_BUILD_DIR/build-tests -type f -name '*.js' -print0 | xargs -0 sed -i '' -e $'s/    /\t/g'
  cat $MEL_BUILD_DIR/index-tests.js | npx esbuild --bundle --outfile=$MEL_BUILD_DIR/tests.js
  cd $backtodir

  # npx fix-esm-import-path $MEL_BUILD_DIR/build-test/*

  cd $MEL_BUILD_DIR
}

# do_build() {
#   npm run buildn --melbuilddir=$MEL_BUILD_DIR --testsfiles="$TEST_FILES"
#   # cp -r ./build/*[html] $MEL_BUILD_DIR
#   # rm -rf $MEL_BUILD_DIR/lib
#   # cp -r ./lib $MEL_BUILD_DIR/lib

#   echo "Fixing imports and bundling tests"
#   # backtodir=$(pwd)
#   # cd $MEL_BUILD_DIR
#   # build an index that imports all non-declaration JS files from build-es
#   # find build-es -type f -name '*.js' ! -name '*.d.js' | sort | while IFS= read -r ln; do
#   #   printf "import './%s';\n" "$ln"
#   # done > index.js

#   # replace four spaces with a tab in all JS files under build-ts (macOS/BSD sed needs -i '')
#   find build-ts -type f -name '*.js' -print0 | xargs -0 sed -i '' -e $'s/    /\t/g'
#   cat $MEL_BUILD_DIR/index.js | npx esbuild --bundle --outfile=$MEL_BUILD_DIR/tests.js
#   # NOTE out of date: must also copy tests.js with debug flag setting
#   cd $backtodir

#   npx fix-esm-import-path $MEL_BUILD_DIR/build-es/*
  
# }

# echo "Building tests to $MEL_BUILD_DIR"
# npx tsc --outDir $MEL_BUILD_DIR && do_build && cd $MEL_BUILD_DIR && python3 -m http.server

echo "Building to '${MEL_BUILD_DIR}' directory..."
if [[ $PURPOSE == 'test' ]]; then
  npx tsc --outDir $MEL_BUILD_DIR/build-ts && do_build_tests &&
    echo 'Tests built successfully!' && python3 -m http.server
else
  echo 'must pass a valid PURPOSE'
fi
