@echo off
pip install -r requirements.txt
call npm i
call conda install -y -c conda-forge ffmpeg
echo Install complete.