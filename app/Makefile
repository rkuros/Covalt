# AWS SAM build targets for Lambda functions
# SAM calls build-{ResourceLogicalId} for each function

build-ApiFunction:
	npm ci
	npx prisma generate
	npm run build
	rm -rf node_modules
	npm ci --omit=dev
	npx prisma generate
	cp -r dist $(ARTIFACTS_DIR)/dist
	cp -r node_modules $(ARTIFACTS_DIR)/node_modules
	cp package.json $(ARTIFACTS_DIR)/

build-ReminderFunction:
	npm ci
	npx prisma generate
	npm run build
	rm -rf node_modules
	npm ci --omit=dev
	npx prisma generate
	cp -r dist $(ARTIFACTS_DIR)/dist
	cp -r node_modules $(ARTIFACTS_DIR)/node_modules
	cp package.json $(ARTIFACTS_DIR)/
