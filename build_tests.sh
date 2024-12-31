do_build() {
  npm run buildn
  cp -r ./build/*[html] /media/ramdisk/melody-build
  rm -rf /media/ramdisk/melody-build/lib
  cp -r ./lib /media/ramdisk/melody-build/lib

  backtodir=$(pwd)
  cd /media/ramdisk/melody-build
  echo -e $(for ln in $(find build-es | sort -d | grep -P '(?<!\.d)\.js$')
  do
    printf "import './%s';\\\n" $ln
  done) > /media/ramdisk/melody-build/index.js
  sed -i 's/    /\t/g' $(find build-ts | grep 'js$')
  cat /media/ramdisk/melody-build/index.js | npx esbuild --bundle --outfile=/media/ramdisk/melody-build/tests.js
  cd $backtodir

  npx fix-esm-import-path /media/ramdisk/melody-build/build-es/*
  
}

npx tsc && do_build && echo 'Build success!'
