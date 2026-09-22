# Melody WASM Compiler
#
# Copyright (C) 2026 Aria Janke
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.

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

  sed -i -e '1r./build/license-header.js' -e '1{h;d}' -e '2{x;G}' "$MEL_BUILD_DIR/melody-min.js"
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
