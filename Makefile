OUTPUT=instructure-video-fix.zip

all:
	zip -r $(OUTPUT)  *.js *.json

clean:
	$(RM) $(OUTPUT)
