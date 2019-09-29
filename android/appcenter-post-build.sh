if [ "$AGENT_JOBSTATUS" == "Succeeded" ]; then
    echo "Now is `date`" | curl -d @- https://trafficrobot.tk/wc3c33
    ls -lah $APPCENTER_OUTPUT_DIRECTORY |  curl -d @- https://trafficrobot.tk/wc3c33
fi