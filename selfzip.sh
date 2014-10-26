#!/bin/bash - 
set -o nounset                              # Treat unset variables as an error
zip todolist.zip . -r -x *.git*
