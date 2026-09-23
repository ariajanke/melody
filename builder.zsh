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

MEL_BUILD_DIR=$(mktemp -d)"/melody-build"

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
  find $MEL_BUILD_DIR/build-tests -type f -name '*.js' -print0 | xargs -0 sed -i '' -e $'s/    /\t/g'
  cat $MEL_BUILD_DIR/index-tests.js | npx esbuild --bundle --outfile=$MEL_BUILD_DIR/tests.js
  cd $backtodir

  cd $MEL_BUILD_DIR
}

echo "Building to '${MEL_BUILD_DIR}' directory..."
if [[ $PURPOSE == 'test' ]]; then
  npx tsc --outDir $MEL_BUILD_DIR/build-ts && do_build_tests &&
    echo 'Tests built successfully!' && python3 -m http.server
else
  echo 'must pass a valid PURPOSE'
fi
