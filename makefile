SHELL = bash

all:
	@ver=$$(perl -ne 'if (/"version":\s*"([^"]+)/) { local $$_ = $$1; tr/.//d; print }' manifest.json) ;\
    name=$$(basename $$(pwd)) ; \
    rm -f $${name}_v$$ver.xpi; \
    zip -r $${name}_v$$ver.xpi chrome chrome.manifest makefile defaults manifest.json -x '*/.svn/*' > /dev/null; \
    echo "$${name}_v$$ver.xpi Done."
