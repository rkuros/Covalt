# AWS SAM build targets for Lambda functions
# SAM calls build-{ResourceLogicalId} for each function

# Shared build steps
define BUILD_LAMBDA
	npm ci
	npx prisma generate
	npm run build
	rm -rf node_modules
	npm ci --omit=dev
	npx prisma generate
	# Remove Prisma packages not needed at runtime (adapter-pg uses pg driver, not native engines)
	rm -rf node_modules/prisma
	rm -rf node_modules/@prisma/engines
	rm -rf node_modules/@prisma/studio-core
	rm -rf node_modules/@prisma/fetch-engine
	rm -rf node_modules/@prisma/get-platform
	rm -rf node_modules/@prisma/dev
	rm -rf node_modules/@prisma/config
	# Remove .bin directory (not needed at Lambda runtime)
	rm -rf node_modules/.bin
	# Remove non-essential files to reduce package size
	find node_modules -name '*.map' -delete 2>/dev/null || true
	find node_modules -name '*.d.ts' -delete 2>/dev/null || true
	find node_modules -name '*.md' -not -name 'LICENSE*' -delete 2>/dev/null || true
	cp -r dist $(ARTIFACTS_DIR)/dist
	cp -r node_modules $(ARTIFACTS_DIR)/node_modules
	cp package.json $(ARTIFACTS_DIR)/
endef

build-ApiFunction:
	$(BUILD_LAMBDA)

build-ReminderFunction:
	$(BUILD_LAMBDA)
