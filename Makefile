# The name of the extension.
extension_name := laproscope

# The UUID of the extension.
extension_uuid := laproscope@red-bean.com

# The name of the profile dir where the extension can be installed.
profile_dir := laproscope

# The zip application to be used.
ZIP := zip

# The target location of the build and build files.
bin_dir := bin

# The target XPI file.
xpi_file := $(bin_dir)/$(extension_name).xpi

# The type of operating system this make command is running on.
os_type := $(patsubst darwin%,darwin,$(shell echo $(OSTYPE)))

# The location of the extension profile.
profile_location := \
      ~/.mozilla/firefox/$(profile_dir)/extensions/\{$(extension_uuid)\}

# The temporary location where the extension tree will be copied and built.
build_dir := build

# This builds the extension XPI file.
.PHONY: all
all: $(xpi_file)
	@echo
	@echo "Build finished successfully."
	@echo

# This cleans all temporary files and directories created by 'make'.
.PHONY: clean
clean:
	@rm -rf $(build_dir)
	@rm -f $(xpi_file)
	@echo "Cleanup is done."

# The sources for the XPI file.
xpi_built := install.rdf \
             chrome.manifest \
             $(wildcard content/*.js) \
             $(wildcard content/*.xul) \
             $(wildcard content/*.xml) \
             $(wildcard content/*.css) \
             $(wildcard skin/*.css) \
             $(wildcard skin/*.png) \
             $(wildcard locale/*/*.dtd) \
             $(wildcard locale/*/*.properties)

# This builds everything except for the actual XPI, and then it copies it to the
# specified profile directory, allowing a quick update that requires no install.
.PHONY: install
install: $(build_dir) $(xpi_built)
	cp -Rf $(build_dir)/* $(profile_location)

$(xpi_file): $(xpi_built)
	$(ZIP) $(xpi_file) $(xpi_built)
