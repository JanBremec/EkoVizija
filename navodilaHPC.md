# Navodila kako poganjat python skripte na arnesovem superracunalniku preko bash terminala

Urejeno moras imeti ssh povezavo

## poganjanje kode
najprej se povezes prek ssh
`ssh hackathon17@hpc-login1.arnes.si`

ko prides notr:

### Za nalaganje novih knjiznic iz environment:
najprej nalozi python in zazeni environment:
```
module load Python
source ./DigiVizija_env/bin/activate

```
ce si spreminjal requirements.txt:
`pip install -r requirements.txt`

ce hoces direkt nalozit s pip:
`pip install <ime knjiznjice>`

### poganjanje skript
Za pognat image_fetcher.py:
`sbatch job_img.sh`
za pognat model2.py:
`sbatch job_model.sh`

tisto kar printa python bo na voljo v DigiVizijaUcenjeTest.out

## upload in download datotek in folderjev
moras imeti urejeno ssh povezavo
ce imas na terminalu program sftp:

povezovanje:
`sftp sftp://hackathon17@hpc-login1.arnes.si`

```
sftp> help			#get list of commands
sftp> ls			#list directory 
sftp> pwd			#print working directory on remote host
sftp> lpwd			#print working directory on local host
sftp> mkdir uploads		#create a new directory
To upload a directory, it must exit on the remote (so first do the mkdir if folder does not exist yet), then run put -r foldername to upload
sftp> mkdir Tecmint.com-articles
sftp> put -r Tecmint.com-articles

cd [path]           #go to remote dir

get remote/path/remoteFile local/path/localFile
```