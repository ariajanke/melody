cp -r ./build /media/ramdisk/melody-build
rm -rf /media/ramdisk/melody-build/lib
cp -r ./lib /media/ramdisk/melody-build/lib
rm /media/ramdisk/melody-build/tests.js
echo $(for ln in $(find tests | sort -d | grep -P '(?<!\.d)\.ts$')
do
  printf "import './%s';\n" $ln
done) > /media/ramdisk/melody-build/build-tests.js
cat /media/ramdisk/melody-build/build-tests.js | npx esbuild --bundle --outfile=/media/ramdisk/melody-build/tests.js

npx jasmine /media/ramdisk/melody-build/tests.js
