"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const GUARDIAN = path.join(ROOT, "guardian");

const TRANSACTIONS = path.join(GUARDIAN, "backups", "transactions");
const TRUSTED = path.join(GUARDIAN, "backups", "trusted");

const IGNORE_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "coverage",
    ".next",
    "guardian/backups",
    "guardian/reports",
    "guardian/quarantine"
]);

const IGNORE_FILES = new Set([
    ".DS_Store"
]);

const PROTECTED_FILES = [
    ".env",
    "prisma/dev.db",
    "prisma/schema.prisma",
    "package.json",
    "package-lock.json"
];

const SOURCE_EXTENSIONS = new Set([
    ".js",
    ".cjs",
    ".mjs",
    ".ts",
    ".tsx"
]);

function log(message) {
    console.log(message);
}

function fail(message) {
    console.error(`[ERROR] ${message}`);
    process.exitCode = 1;
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function normalize(relativePath) {
    return relativePath.replace(/\\/g, "/");
}

function isIgnored(relativePath) {
    const p = normalize(relativePath);

    for (const ignored of IGNORE_DIRS) {
        if (
            p === ignored ||
            p.startsWith(ignored + "/")
        ) {
            return true;
        }
    }

    return IGNORE_FILES.has(path.basename(p));
}

function walk(current, base = ROOT) {
    const result = [];

    if (!fs.existsSync(current)) {
        return result;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {

        const absolute = path.join(current, entry.name);
        const relative = normalize(path.relative(base, absolute));

        if (isIgnored(relative)) {
            continue;
        }

        if (entry.isDirectory()) {
            result.push(...walk(absolute, base));
        } else if (entry.isFile()) {
            result.push(relative);
        }
    }

    return result;
}

function sha256(file) {
    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(file));
    return hash.digest("hex");
}

function snapshotName(prefix) {
    return `${prefix}_${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function createSnapshot(prefix = "TX") {

    ensureDir(TRANSACTIONS);

    const name = snapshotName(prefix);
    const destination = path.join(TRANSACTIONS, name);

    ensureDir(destination);

    const files = walk(ROOT);

    const manifest = {
        version: "2.1",
        createdAt: new Date().toISOString(),
        files: {}
    };

    for (const relative of files) {

        const source = path.join(ROOT, relative);
        const target = path.join(destination, relative);

        ensureDir(path.dirname(target));
        fs.copyFileSync(source, target);

        manifest.files[relative] = {
            sha256: sha256(source),
            size: fs.statSync(source).size
        };
    }

    fs.writeFileSync(
        path.join(destination, "TRANSACTION_MANIFEST.json"),
        JSON.stringify(manifest, null, 2),
        "utf8"
    );

    fs.writeFileSync(
        path.join(TRANSACTIONS, "CURRENT_TRANSACTION.json"),
        JSON.stringify({
            version: "2.1",
            transaction: name,
            path: destination,
            createdAt: manifest.createdAt
        }, null, 2),
        "utf8"
    );

    log(`[SNAPSHOT] ${name}`);
    log(`[SNAPSHOT] ${Object.keys(manifest.files).length} arquivos protegidos no snapshot.`);

    return {
        name,
        path: destination,
        manifest
    };
}

function loadCurrentTransaction() {

    const file = path.join(
        TRANSACTIONS,
        "CURRENT_TRANSACTION.json"
    );

    if (!fs.existsSync(file)) {
        throw new Error(
            "Nenhuma transação ativa. Execute primeiro: npm run guardian:begin"
        );
    }

    const data = JSON.parse(fs.readFileSync(file, "utf8"));

    if (!fs.existsSync(data.path)) {
        throw new Error(
            "Snapshot da transação não existe mais: " + data.path
        );
    }

    return data;
}

function compareSnapshot(snapshot) {

    const currentFiles = new Set(walk(ROOT));

    const snapshotFiles = new Set(
        Object.keys(snapshot.manifest.files)
    );

    const added = [];
    const removed = [];
    const changed = [];

    for (const file of currentFiles) {

        if (!snapshotFiles.has(file)) {
            added.push(file);
            continue;
        }

        const current = path.join(ROOT, file);
        const oldHash = snapshot.manifest.files[file].sha256;
        const newHash = sha256(current);

        if (oldHash !== newHash) {
            changed.push(file);
        }
    }

    for (const file of snapshotFiles) {

        if (!currentFiles.has(file)) {
            removed.push(file);
        }
    }

    return {
        added,
        removed,
        changed
    };
}

function printChanges(changes) {

    log("");
    log("============================================================");
    log(" ALTERACOES DETECTADAS");
    log("============================================================");

    log(`[INFO] Novos arquivos: ${changes.added.length}`);
    log(`[INFO] Arquivos alterados: ${changes.changed.length}`);
    log(`[INFO] Arquivos removidos: ${changes.removed.length}`);

    if (changes.added.length) {
        log("");
        log("[NOVOS]");

        for (const file of changes.added.slice(0, 100)) {
            log(`  + ${file}`);
        }
    }

    if (changes.changed.length) {
        log("");
        log("[ALTERADOS]");

        for (const file of changes.changed.slice(0, 100)) {
            log(`  ~ ${file}`);
        }
    }

    if (changes.removed.length) {
        log("");
        log("[REMOVIDOS]");

        for (const file of changes.removed.slice(0, 100)) {
            log(`  - ${file}`);
        }
    }

    log("");
}

function run(command, args = []) {

    const isWindows = process.platform === "win32";

    if (isWindows) {

        const commandLine = [
            command,
            ...args
        ].map(value => {
            const s = String(value);

            if (
                s.includes(" ") ||
                s.includes("(") ||
                s.includes(")") ||
                s.includes("&")
            ) {
                return `"${s.replace(/"/g, '\\"')}"`;
            }

            return s;
        }).join(" ");

        return cp.spawnSync(
            "cmd.exe",
            ["/d", "/s", "/c", commandLine],
            {
                cwd: ROOT,
                encoding: "utf8",
                stdio: "pipe"
            }
        );
    }

    return cp.spawnSync(
        command,
        args,
        {
            cwd: ROOT,
            encoding: "utf8",
            stdio: "pipe"
        }
    );
}

function output(result) {

    if (result.stdout) {
        process.stdout.write(result.stdout);
    }

    if (result.stderr) {
        process.stderr.write(result.stderr);
    }
}

function runValidation() {

    const checks = [];

    log("");
    log("============================================================");
    log(" VALIDACAO POS-ALTERACAO");
    log("============================================================");

    log("");
    log("[1/4] Prisma validate");

    let result = run("npx", ["prisma", "validate"]);
    output(result);

    if (result.status !== 0) {
        checks.push({
            name: "Prisma",
            ok: false
        });
    } else {
        checks.push({
            name: "Prisma",
            ok: true
        });
    }

    log("");
    log("[2/4] TypeScript build");

    result = run("npm", ["run", "build"]);
    output(result);

    checks.push({
        name: "Build",
        ok: result.status === 0
    });

    log("");
    log("[3/4] Jest");

    result = run("npm", [
        "test",
        "--",
        "--runInBand",
        "--forceExit"
    ]);

    output(result);

    checks.push({
        name: "Jest",
        ok: result.status === 0
    });

    log("");
    log("[4/4] Arquivos protegidos");

    let protectedOk = true;

    for (const file of PROTECTED_FILES) {

        const full = path.join(ROOT, file);

        if (!fs.existsSync(full)) {
            protectedOk = false;
            log(`[FAIL] Arquivo protegido ausente: ${file}`);
        } else {
            log(`[OK] ${file}`);
        }
    }

    checks.push({
        name: "Protected",
        ok: protectedOk
    });

    return {
        ok: checks.every(x => x.ok),
        checks
    };
}

function saveTrustedState() {

    const files = walk(ROOT);

    const manifest = {
        version: "2.1",
        acceptedAt: new Date().toISOString(),
        files: {}
    };

    for (const relative of files) {

        const full = path.join(ROOT, relative);

        manifest.files[relative] = {
            sha256: sha256(full),
            size: fs.statSync(full).size
        };
    }

    const state = path.join(
        TRUSTED,
        "TRUSTED_GREEN_MANIFEST.json"
    );

    ensureDir(TRUSTED);

    fs.writeFileSync(
        state,
        JSON.stringify(manifest, null, 2),
        "utf8"
    );

    log(`[TRUSTED] Estado GREEN atualizado: ${state}`);
}

function rollback(snapshotData) {

    log("");
    log("============================================================");
    log(" ROLLBACK AUTOMATICO");
    log("============================================================");

    const snapshotRoot = snapshotData.path;
    const manifest = snapshotData.manifest;

    const currentFiles = walk(ROOT);

    for (const relative of currentFiles) {

        if (
            !Object.prototype.hasOwnProperty.call(
                manifest.files,
                relative
            )
        ) {

            const full = path.join(ROOT, relative);

            try {

                fs.rmSync(full, {
                    force: true
                });

                log(`[REMOVE] ${relative}`);

            } catch (error) {

                log(
                    `[FAIL] Não foi possível remover ${relative}: ${error.message}`
                );
            }
        }
    }

    for (const relative of Object.keys(manifest.files)) {

        const source = path.join(snapshotRoot, relative);
        const target = path.join(ROOT, relative);

        if (!fs.existsSync(source)) {
            continue;
        }

        ensureDir(path.dirname(target));

        fs.copyFileSync(source, target);

        log(`[RESTORE] ${relative}`);
    }

    log("");
    log("[ROLLBACK] Estado anterior restaurado exatamente.");
}

function begin() {

    log("");
    log("============================================================");
    log(" GUARDIAN V2.1 - BEGIN");
    log("============================================================");

    const snapshot = createSnapshot("TX");

    log("");
    log("GUARDIAN V2.1 - TRANSAÇÃO ABERTA");
    log("");
    log("Agora a Qwen pode trabalhar.");
    log("Depois das alterações execute:");
    log("npm run guardian:commit");
}

function commit() {

    log("");
    log("============================================================");
    log(" GUARDIAN V2.1 - COMMIT");
    log("============================================================");

    const current = loadCurrentTransaction();

    const snapshotManifest = JSON.parse(
        fs.readFileSync(
            path.join(current.path, "TRANSACTION_MANIFEST.json"),
            "utf8"
        )
    );

    const snapshot = {
        ...current,
        manifest: snapshotManifest
    };

    const changes = compareSnapshot(snapshot);

    printChanges(changes);

    const validation = runValidation();

    if (validation.ok) {

        log("");
        log("============================================================");
        log(" GUARDIAN V2.1 - GREEN");
        log("============================================================");

        saveTrustedState();

        const resultFile = path.join(
            current.path,
            "COMMIT_GREEN.json"
        );

        fs.writeFileSync(
            resultFile,
            JSON.stringify({
                status: "GREEN",
                committedAt: new Date().toISOString(),
                changes,
                validation
            }, null, 2),
            "utf8"
        );

        log("");
        log("[ACCEPT] Alterações aceitas.");
        log("[ACCEPT] Novo estado virou estado confiável.");
        log("");
        log("GUARDIAN V2.1 - GREEN CONFIRMADO");

        return;
    }

    log("");
    log("============================================================");
    log(" GUARDIAN V2.1 - RED");
    log("============================================================");

    log("[RED] Validação falhou.");
    log("[ACTION] Rollback será executado.");

    rollback(snapshot);

    log("");
    log("[VERIFY] Validando estado restaurado...");

    const verify = runValidation();

    if (!verify.ok) {

        log("");
        log("[CRITICAL] O estado restaurado não passou na validação.");
        log("[CRITICAL] NÃO continuar com a Qwen.");
        process.exitCode = 2;
        return;
    }

    log("");
    log("============================================================");
    log(" GUARDIAN V2.1 - ROLLBACK GREEN");
    log("============================================================");
    log("");
    log("Estado anterior restaurado e validado.");
    log("As alterações rejeitadas foram descartadas.");

    process.exitCode = 1;
}

function status() {

    const currentFile = path.join(
        TRANSACTIONS,
        "CURRENT_TRANSACTION.json"
    );

    log("");
    log("============================================================");
    log(" GUARDIAN V2.1 - STATUS");
    log("============================================================");

    if (!fs.existsSync(currentFile)) {
        log("[INFO] Nenhuma transação aberta.");
        return;
    }

    const current = JSON.parse(
        fs.readFileSync(currentFile, "utf8")
    );

    log(`[TRANSACTION] ${current.transaction}`);
    log(`[PATH] ${current.path}`);
    log(`[CREATED] ${current.createdAt}`);

    const manifest = JSON.parse(
        fs.readFileSync(
            path.join(current.path, "TRANSACTION_MANIFEST.json"),
            "utf8"
        )
    );

    const snapshot = {
        ...current,
        manifest
    };

    const changes = compareSnapshot(snapshot);

    printChanges(changes);
}

function main() {

    const command = process.argv[2];

    switch (command) {

        case "begin":
            begin();
            break;

        case "commit":
            commit();
            break;

        case "status":
            status();
            break;

        default:

            log("");
            log("GUARDIAN V2.1");
            log("");
            log("Uso:");
            log("  node guardian/transaction.js begin");
            log("  node guardian/transaction.js status");
            log("  node guardian/transaction.js commit");
            log("");
            process.exitCode = 1;
    }
}

main();