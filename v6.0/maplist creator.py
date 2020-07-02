import glob

osupath = input('Please enter the path to your osu songs folder for training: ')
verbose = input('Show verbose output? y/n: ')
files = glob.glob(osupath + '/**/*.osu', recursive = True) 
numwritten = 0
f = open('maplist.txt','w+')

for filename in glob.iglob(osupath + '/**/*.osu', recursive = True): 
    if(verbose == 'y' or verbose == 'Y' or verbose == 'Yes' or verbose == 'YES'):
        print(filename) 
    f.write('\n' + filename)
    numwritten+=1

print('#######################################################################################')
print('Wrote ' + str(numwritten) + ' map paths to maplist.txt')
input('maplist.txt generated in the same directory as this script, press enter to exit')
