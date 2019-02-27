SHELL = bash

all:
	@ver=$$(grep "<version>" install.rdf | perl -p -e 's/[^\d]//g') ;\
    name=$$(basename $$(pwd)) ; \
    rm -f $${name}_v$$ver.xpi; \
    zip -r $${name}_v$$ver.xpi chrome chrome.manifest makefile defaults install.rdf -x '*/.svn/*' > /dev/null; \
    echo "$${name}_v$$ver.xpi Done."
