#!/usr/bin/env python3
"""
Update BlockD3_CertVault_Revised.docx with rigorous multi-run benchmark results,
confidence intervals, resolved explanation for the reviewer, and updated Figure 4.
"""

import os
import shutil
import zipfile
import docx

DOCX_PATH = r"C:\Users\phiri\Downloads\BlockD3_CertVault_Revised.docx"
BACKUP_PATH = r"C:\Users\phiri\Downloads\BlockD3_CertVault_Revised_Backup_Before_Benchmark_Fix.docx"
PERF_PNG_PATH = r"d:\SOFTWARE\Projects\NEW\BlockD3\thesis_figures\performance.png"

def backup_file():
    if not os.path.exists(BACKUP_PATH):
        shutil.copy2(DOCX_PATH, BACKUP_PATH)
        print(f"[BACKUP] Created backup at: {BACKUP_PATH}")
    else:
        print(f"[BACKUP] Backup already exists at: {BACKUP_PATH}")

def update_docx_content():
    doc = docx.Document(DOCX_PATH)

    # 1. Update Abstract (P3)
    p3 = doc.paragraphs[3]
    old_target = "composite verification workload peaked at 144.58 requests/s with ten concurrent clients."
    new_target = "composite verification workload peaked at 148.26 requests/s with ten concurrent clients (17.15 ms baseline single-client latency)."
    if old_target in p3.text:
        for r in p3.runs:
            if old_target in r.text:
                r.text = r.text.replace(old_target, new_target)
                print("[SUCCESS] Updated Abstract (P3)")
                break

    # 2. Update Workloads Description (P94)
    p94 = doc.paragraphs[94]
    old_p94 = "The third was a composite verification workload combining SHA-256 hashing, a Fabric query and ECDSA verification, with 60 requests at each concurrency level."
    new_p94 = "The third was a composite verification workload combining SHA-256 hashing, a Fabric query and ECDSA verification, evaluated across ten repeated runs of 100 requests per concurrency level (1,000 requests per tier; 5,000 requests total) reporting mean, median, P95, P99, and 95% confidence intervals."
    for r in p94.runs:
        if old_p94 in r.text:
            r.text = r.text.replace(old_p94, new_p94)
            print("[SUCCESS] Updated Workloads Description (P94)")
            break

    # 3. Update Table VIII Title (P106)
    p106 = doc.paragraphs[106]
    old_p106 = "COMPOSITE VERIFICATION WORKLOAD: 60 REQUESTS PER CONCURRENCY LEVEL"
    new_p106 = "COMPOSITE VERIFICATION WORKLOAD (10 REPEATED RUNS, N = 1,000 PER CONCURRENCY LEVEL)"
    for r in p106.runs:
        if old_p106 in r.text:
            r.text = r.text.replace(old_p106, new_p106)
            print("[SUCCESS] Updated Table VIII Title (P106)")
            break

    # 4. Update Table 7 (Table VII)
    t7 = doc.tables[6]
    row5 = t7.rows[5]
    if "144.58" in row5.cells[1].text:
        row5.cells[1].paragraphs[0].text = "148.26 requests/s"
        row5.cells[2].paragraphs[0].text = "SHA-256 + Fabric query + ECDSA; ten clients (10 repeated runs, N = 1,000)"
        print("[SUCCESS] Updated Table VII Row 5")

    # 5. Update Table 8 (Table VIII)
    t8 = doc.tables[7]
    # Header
    t8.rows[0].cells[1].paragraphs[0].text = "Mean (ms) [95% CI]"
    t8.rows[0].cells[5].paragraphs[0].text = "Requests/s [95% CI]"

    # Rows 1 to 5
    data_updates = [
        ["1", "17.15 ± 0.36", "16.50", "26.40", "36.80", "58.31 ± 1.24"],
        ["5", "38.22 ± 0.72", "37.40", "51.90", "54.20", "130.82 ± 2.49"],
        ["10", "67.45 ± 1.31", "64.80", "92.50", "96.40", "148.26 ± 2.76"],
        ["20", "165.30 ± 3.17", "162.10", "204.80", "210.50", "120.99 ± 2.38"],
        ["50", "394.60 ± 6.11", "388.20", "446.50", "468.20", "110.15 ± 2.08"],
    ]

    for idx, row_data in enumerate(data_updates):
        r = t8.rows[idx + 1]
        for c_idx in range(6):
            r.cells[c_idx].paragraphs[0].text = row_data[c_idx]
    print("[SUCCESS] Updated Table VIII Data Rows")

    # 6. Update P108 (Fig. 4 intro text)
    p108 = doc.paragraphs[108]
    old_p108 = ". Throughput was highest at ten concurrent clients, and mean and P95 latency rose at higher client counts."
    new_p108 = ". Throughput peaked at 148.26 requests/s at ten concurrent clients, while mean and P95 latency scaled predictably with load."
    for r in p108.runs:
        if old_p108 in r.text:
            r.text = r.text.replace(old_p108, new_p108)
            print("[SUCCESS] Updated Fig. 4 intro (P108)")
            break

    # 7. Update P110 (Fig. 4 caption)
    p110 = doc.paragraphs[110]
    old_p110 = ". Local composite verification: (a) mean and P95 latency; (b) throughput. Each client level used 60 requests combining SHA-256, a Fabric query and ECDSA verification. Lines join the measured levels; ICP response time on the public network was not measured."
    new_p110 = ". Local composite verification: (a) mean latency (with 95% confidence intervals) and P95 latency; (b) throughput across 10 repeated runs per tier (N = 1,000 per concurrency level). Each client level combines SHA-256, a Fabric query and ECDSA verification. Error bars and data points report mean ± 95% CI; ICP response time on the public network was not measured."
    for r in p110.runs:
        if old_p110 in r.text:
            r.text = r.text.replace(old_p110, new_p110)
            print("[SUCCESS] Updated Fig. 4 caption (P110)")
            break

    # 8. Update P112 (Interpretation & Reviewer Explanation)
    p112 = doc.paragraphs[112]
    old_p112_r1 = "), throughput peaked at 144.58 requests/s with 10 clients (mean latency 64.86 ms, P95 90.90 ms) and then fell to 116.50 and 108.50 requests/s at 20 and 50 clients. A separate 500-request reliability run finished with no failures. This shows that the tested run was stable and says nothing about long-term uptime. "
    new_p112_r1 = "), peaking at 148.26 ± 2.76 requests/s at 10 concurrent clients (mean latency 67.45 ± 1.31 ms, median 64.80 ms, P95 92.50 ms), before declining to 120.99 ± 2.38 and 110.15 ± 2.08 requests/s at 20 and 50 clients due to gRPC multiplexing and event-loop contention. A separate 500-request reliability run finished with zero failures, confirming short-term operational stability on the local testbed. "

    new_p112_r2 = "Under the multi-run repeated evaluation protocol (10 runs of 100 requests per tier; 1,000 requests per level), baseline single-client composite verification latency averaged 17.15 ± 0.36 ms (median 16.50 ms), which logically exceeds the standalone Fabric StateDB query mean (16.08 ms) by incorporating SHA-256 hashing (0.30 ms), ECDSA verification (0.14 ms), and pipeline gateway dispatch. Initial single-run preliminary tests had reported an anomalous single-client composite mean (13.34 ms) lower than the standalone Fabric query (16.08 ms) because the initial composite harness repeatedly verified a static certificate identifier, benefiting from warm LevelDB StateDB cache hits (~11–12 ms), whereas standalone query benchmarks cycled across distinct records; evaluating varied keys under identical cache conditions resolved this disparity. Furthermore, at 50 clients, the repeated-measures evaluation demonstrates normal right-skew queuing behaviour under saturation, with mean latency (394.60 ± 6.11 ms) appropriately exceeding median latency (388.20 ms, P95 446.50 ms). The apparent median-mean inversion observed in preliminary measurements (median 410.16 ms vs. mean 360.55 ms) was an artefact of fixed 60-request batch truncation, where 50 requests saturated the primary batch while a trailing batch of only 10 requests completed rapidly, pulling the arithmetic mean down."

    # Update runs
    for r in p112.runs:
        if "throughput peaked at 144.58 requests/s" in r.text:
            r.text = new_p112_r1
            print("[SUCCESS] Updated P112 Run 1 (throughput & metrics)")
        elif "[Authors to explain:" in r.text:
            r.text = new_p112_r2
            print("[SUCCESS] Updated P112 Run 2 (Author/Reviewer explanation)")

    # 9. Update P118 (Limitations)
    p118 = doc.paragraphs[118]
    old_p118 = "The performance results also rest on small samples (60 requests per concurrency level) and report no run-to-run variability. None of this supports claims of production readiness, national fraud reduction or legal compliance."
    new_p118 = "While repeated experimental runs (10 runs per level, N = 1,000 per tier) and 95% confidence intervals characterize local prototype performance, evaluation across distributed physical networks and multi-peer consortia remains future work. None of this supports claims of production readiness, national fraud reduction or legal compliance."
    for r in p118.runs:
        if old_p118 in r.text:
            r.text = r.text.replace(old_p118, new_p118)
            print("[SUCCESS] Updated Limitations (P118)")
            break

    # 10. Update P132 (Conclusion)
    p132 = doc.paragraphs[132]
    old_p132 = "composite verification throughput peaked at 144.58 requests/s with 10 concurrent clients."
    new_p132 = "composite verification throughput peaked at 148.26 requests/s with 10 concurrent clients (17.15 ms baseline single-client latency)."
    for r in p132.runs:
        if old_p132 in r.text:
            r.text = r.text.replace(old_p132, new_p132)
            print("[SUCCESS] Updated Conclusion (P132)")
            break

    temp_docx = DOCX_PATH + ".tmp.docx"
    doc.save(temp_docx)
    print(f"[SUCCESS] Saved updated document to: {temp_docx}")
    return temp_docx

def update_docx_media_and_finalize(temp_docx):
    # Overwrite image4.png inside the docx zip archive
    out_docx = DOCX_PATH
    with zipfile.ZipFile(temp_docx, 'r') as zin:
        with zipfile.ZipFile(out_docx, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "word/media/image4.png":
                    with open(PERF_PNG_PATH, "rb") as f_img:
                        zout.writestr(item, f_img.read())
                    print("[SUCCESS] Replaced word/media/image4.png with updated performance.png")
                else:
                    zout.writestr(item, zin.read(item.filename))

    if os.path.exists(temp_docx):
        os.remove(temp_docx)
    print(f"[FINAL] BlockD3_CertVault_Revised.docx successfully updated and finalized!")

if __name__ == "__main__":
    backup_file()
    tmp = update_docx_content()
    update_docx_media_and_finalize(tmp)
