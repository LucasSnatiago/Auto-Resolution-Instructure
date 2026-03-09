OUTPUT=instructure-video-fix.zip

all:
	zip -r $(OUTPUT)  *.js *.json *.html *.css

clean:
	$(RM) $(OUTPUT)
