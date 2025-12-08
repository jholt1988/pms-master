/**
 * Endpoint Testing Script
 * Tests all backend endpoints for malformed routes, duplicates, and conflicts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteInfo {
  file: string;
  controller: string;
  method: string;
  path: string;
  fullPath: string;
  line: number;
}

interface EndpointIssue {
  type: 'duplicate' | 'conflict' | 'malformed' | 'missing_handler';
  severity: 'error' | 'warning';
  message: string;
  routes: RouteInfo[];
}

class EndpointTester {
  private routes: RouteInfo[] = [];
  private issues: EndpointIssue[] = [];

  async scanControllers(): Promise<void> {
    const srcDir = path.join(__dirname, '..', 'src');
    const controllerFiles = this.findControllerFiles(srcDir);

    console.log(`\n📋 Found ${controllerFiles.length} controller files\n`);

    for (const file of controllerFiles) {
      await this.scanControllerFile(file);
    }
  }

  private findControllerFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.findControllerFiles(filePath, fileList);
      } else if (file.endsWith('.controller.ts')) {
        fileList.push(filePath);
      }
    }

    return fileList;
  }

  private async scanControllerFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // Extract controller decorator
    const controllerMatch = content.match(/@Controller\(['"`]([^'"`]+)['"`]\)/);
    if (!controllerMatch) {
      // Try array syntax
      const controllerArrayMatch = content.match(/@Controller\(\[['"`]([^'"`]+)['"`](?:,\s*['"`]([^'"`]+)['"`])?\]\)/);
      if (controllerArrayMatch) {
        const basePaths = [controllerArrayMatch[1], controllerArrayMatch[2]].filter(Boolean);
        for (const basePath of basePaths) {
          this.extractRoutes(content, lines, relativePath, basePath);
        }
      } else {
        console.log(`⚠️  No @Controller found in ${relativePath}`);
      }
      return;
    }

    const basePath = controllerMatch[1];
    this.extractRoutes(content, lines, relativePath, basePath);
  }

  private extractRoutes(
    content: string,
    lines: string[],
    filePath: string,
    basePath: string,
  ): void {
    // Extract all route decorators
    const routePatterns = [
      { decorator: '@Get', method: 'GET' },
      { decorator: '@Post', method: 'POST' },
      { decorator: '@Put', method: 'PUT' },
      { decorator: '@Delete', method: 'DELETE' },
      { decorator: '@Patch', method: 'PATCH' },
    ];

    for (const { decorator, method } of routePatterns) {
      const regex = new RegExp(`${decorator}\\(['"\`]([^'"\`]*)['"\`]\\)`, 'g');
      let match;
      let lineNum = 1;

      for (const line of lines) {
        if (line.includes(decorator)) {
          while ((match = regex.exec(line)) !== null) {
            const routePath = match[1] || '';
            const fullPath = this.buildFullPath(basePath, routePath);

            this.routes.push({
              file: filePath,
              controller: basePath,
              method,
              path: routePath,
              fullPath,
              line: lineNum,
            });
          }
        }
        lineNum++;
      }
    }
  }

  private buildFullPath(basePath: string, routePath: string): string {
    // Handle base paths that already include /api
    if (basePath.startsWith('api/')) {
      return `/${basePath}${routePath ? '/' + routePath : ''}`;
    }

    // Handle base paths that start with /
    if (basePath.startsWith('/')) {
      return `${basePath}${routePath ? '/' + routePath : ''}`;
    }

    // Default: add /api prefix (from global prefix)
    const normalizedBase = basePath.startsWith('/') ? basePath : `/${basePath}`;
    const normalizedRoute = routePath.startsWith('/') ? routePath : routePath ? `/${routePath}` : '';
    
    // Check if basePath already includes 'api'
    if (normalizedBase.includes('api/') || normalizedBase === '/api') {
      return `${normalizedBase}${normalizedRoute}`;
    }

    return `/api${normalizedBase}${normalizedRoute}`;
  }

  analyzeRoutes(): void {
    console.log(`\n🔍 Analyzing ${this.routes.length} routes...\n`);

    // Check for duplicates (same method + path)
    this.checkDuplicates();

    // Check for route conflicts (parameterized vs static)
    this.checkConflicts();

    // Check for malformed paths
    this.checkMalformedPaths();

    // Check for routes without handlers
    this.checkMissingHandlers();
  }

  private checkDuplicates(): void {
    const routeMap = new Map<string, RouteInfo[]>();

    for (const route of this.routes) {
      const key = `${route.method}:${route.fullPath}`;
      if (!routeMap.has(key)) {
        routeMap.set(key, []);
      }
      routeMap.get(key)!.push(route);
    }

    for (const [key, routes] of routeMap.entries()) {
      if (routes.length > 1) {
        this.issues.push({
          type: 'duplicate',
          severity: 'error',
          message: `Duplicate route: ${key}`,
          routes,
        });
      }
    }
  }

  private checkConflicts(): void {
    // Group routes by method
    const byMethod = new Map<string, RouteInfo[]>();
    for (const route of this.routes) {
      if (!byMethod.has(route.method)) {
        byMethod.set(route.method, []);
      }
      byMethod.get(route.method)!.push(route);
    }

    for (const [method, routes] of byMethod.entries()) {
      for (let i = 0; i < routes.length; i++) {
        for (let j = i + 1; j < routes.length; j++) {
          const route1 = routes[i];
          const route2 = routes[j];

          if (this.pathsConflict(route1.fullPath, route2.fullPath)) {
            this.issues.push({
              type: 'conflict',
              severity: 'warning',
              message: `Route conflict: ${method} ${route1.fullPath} vs ${route2.fullPath}`,
              routes: [route1, route2],
            });
          }
        }
      }
    }
  }

  private pathsConflict(path1: string, path2: string): boolean {
    // Normalize paths
    const normalize = (p: string) => p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    const norm1 = normalize(path1);
    const norm2 = normalize(path2);

    if (norm1 === norm2) return false; // Duplicates handled separately

    // Check if one is a parameterized version of the other
    const segments1 = norm1.split('/').filter(Boolean);
    const segments2 = norm2.split('/').filter(Boolean);

    if (segments1.length !== segments2.length) return false;

    for (let i = 0; i < segments1.length; i++) {
      const seg1 = segments1[i];
      const seg2 = segments2[i];

      // One is a parameter, one is static
      if (
        (seg1.startsWith(':') && !seg2.startsWith(':')) ||
        (!seg1.startsWith(':') && seg2.startsWith(':'))
      ) {
        // Check if all previous segments match
        let matches = true;
        for (let j = 0; j < i; j++) {
          if (segments1[j] !== segments2[j]) {
            matches = false;
            break;
          }
        }
        if (matches) return true;
      }
    }

    return false;
  }

  private checkMalformedPaths(): void {
    for (const route of this.routes) {
      // Check for double slashes
      if (route.fullPath.includes('//')) {
        this.issues.push({
          type: 'malformed',
          severity: 'warning',
          message: `Double slashes in path: ${route.fullPath}`,
          routes: [route],
        });
      }

      // Check for trailing slashes on parameterized routes
      if (route.fullPath.endsWith('/:') || route.fullPath.match(/\/:\w+\//)) {
        this.issues.push({
          type: 'malformed',
          severity: 'warning',
          message: `Malformed parameter in path: ${route.fullPath}`,
          routes: [route],
        });
      }

      // Check for invalid parameter syntax
      if (route.fullPath.match(/:[^/]+:[^/]+/)) {
        this.issues.push({
          type: 'malformed',
          severity: 'error',
          message: `Invalid parameter syntax: ${route.fullPath}`,
          routes: [route],
        });
      }
    }
  }

  private checkMissingHandlers(): void {
    // This would require parsing the actual method implementations
    // For now, we'll just note routes that might be missing handlers
    // This is a simplified check - full implementation would require AST parsing
  }

  printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ENDPOINT ANALYSIS RESULTS');
    console.log('='.repeat(80) + '\n');

    if (this.issues.length === 0) {
      console.log('✅ No issues found! All endpoints look good.\n');
      return;
    }

    // Group by type
    const byType = new Map<string, EndpointIssue[]>();
    for (const issue of this.issues) {
      if (!byType.has(issue.type)) {
        byType.set(issue.type, []);
      }
      byType.get(issue.type)!.push(issue);
    }

    // Print by severity
    const errors = this.issues.filter((i) => i.severity === 'error');
    const warnings = this.issues.filter((i) => i.severity === 'warning');

    if (errors.length > 0) {
      console.log(`❌ ERRORS (${errors.length}):\n`);
      for (const issue of errors) {
        console.log(`  ${issue.message}`);
        for (const route of issue.routes) {
          console.log(`    - ${route.method} ${route.fullPath}`);
          console.log(`      File: ${route.file}:${route.line}`);
        }
        console.log('');
      }
    }

    if (warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${warnings.length}):\n`);
      for (const issue of warnings) {
        console.log(`  ${issue.message}`);
        for (const route of issue.routes) {
          console.log(`    - ${route.method} ${route.fullPath}`);
          console.log(`      File: ${route.file}:${route.line}`);
        }
        console.log('');
      }
    }

    // Summary
    console.log('\n' + '-'.repeat(80));
    console.log('📈 SUMMARY:');
    console.log(`  Total routes: ${this.routes.length}`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log('-'.repeat(80) + '\n');

    // List all routes by controller
    console.log('\n📋 ALL ROUTES BY CONTROLLER:\n');
    const byController = new Map<string, RouteInfo[]>();
    for (const route of this.routes) {
      if (!byController.has(route.controller)) {
        byController.set(route.controller, []);
      }
      byController.get(route.controller)!.push(route);
    }

    for (const [controller, routes] of Array.from(byController.entries()).sort()) {
      console.log(`  ${controller}:`);
      for (const route of routes.sort((a, b) => a.fullPath.localeCompare(b.fullPath))) {
        console.log(`    ${route.method.padEnd(6)} ${route.fullPath}`);
      }
      console.log('');
    }
  }
}

// Main execution
async function main() {
  const tester = new EndpointTester();

  try {
    await tester.scanControllers();
    tester.analyzeRoutes();
    tester.printResults();

    const errors = tester['issues'].filter((i: EndpointIssue) => i.severity === 'error');
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error running endpoint tests:', error);
    process.exit(1);
  }
}

main();

