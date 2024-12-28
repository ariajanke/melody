npx tsc
npm run buildn
cp -r ./build /media/ramdisk/melody-build
rm -rf /media/ramdisk/melody-build/lib
cp -r ./lib /media/ramdisk/melody-build/lib

backtodir=$(pwd)
cd /media/ramdisk/melody-build
echo -e $(for ln in $(find build-es | sort -d | grep -P '(?<!\.d)\.js$')
do
  printf "import './%s';\\\n" $ln
done) > /media/ramdisk/melody-build/index.js
sed -i 's/    /\t/g' $(find build-ts | grep 'js$')
cd $backtodir

# fuck you bitch ass motherfucking ideologues at Mikrosoft
npx fix-esm-import-path /media/ramdisk/melody-build/build-es/*
