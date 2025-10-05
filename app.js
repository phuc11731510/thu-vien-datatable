(function () {
  "use strict";
  const pad2 = n => String(n).padStart(2,"0");
  const todayForFilename = () => {
    const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const debounce = (fn, ms=200) => { let t=null; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
  const esc = (s) => String(s ?? "").replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function ensurePreviewBox(){
    let el = document.getElementById("cover-preview");
    if(!el){ el=document.createElement("div"); el.id="cover-preview"; el.setAttribute("role","dialog"); el.setAttribute("aria-hidden","true"); document.body.appendChild(el); }
    return el;
  }
  function placePreviewAtPointer(preview, evt){
    preview.style.visibility="hidden"; preview.style.display="block";
    const pad=14, r=preview.getBoundingClientRect(); let x=evt.clientX+16, y=evt.clientY+16;
    if(x+r.width>innerWidth-pad) x=evt.clientX-r.width-16;
    if(y+r.height>innerHeight-pad) y=Math.max(pad, innerHeight-r.height-pad);
    if(x<pad) x=pad; preview.style.left=x+"px"; preview.style.top=y+"px"; preview.style.visibility="visible";
  }
  function placePreviewNearRow(preview, rowEl){
    preview.style.visibility="hidden"; preview.style.display="block";
    const pad=12, rr=rowEl.getBoundingClientRect(), r=preview.getBoundingClientRect();
    let x=rr.right+pad, y=rr.top;
    if(x+r.width>innerWidth-pad) x=rr.left-r.width-pad;
    if(y+r.height>innerHeight-pad) y=Math.max(pad, innerHeight-r.height-pad);
    if(y<pad) y=pad; preview.style.left=x+"px"; preview.style.top=y+"px"; preview.style.visibility="visible";
  }
  async function loadBooks(){
    const paths=["./books.json","./data/books.json"];
    for(const p of paths){
      try{ const res=await fetch(p,{cache:"no-store"}); if(res.ok){ const data=await res.json(); if(Array.isArray(data)) return data; if(Array.isArray(data?.books)) return data.books; } }
      catch(e){}
    }
    return [];
  }
  function initTable(books){
    const filenameBase=`thu-vien_${todayForFilename()}`;
    const clamp2 = (data, type) => (type === "display" ? `<span class="cell clamp-2">${esc(data)}</span>` : data);
    const table = $("#tbl").DataTable({
      data: books,
      autoWidth: false,
      deferRender: true,
      paging: true,
      pageLength: 10,
      lengthMenu: [[5,10,20,50,100],[5,10,20,50,100]],
      responsive: false,
      order: [[1,"asc"]],
      dom: "<'dt-toolbar'Bfl>tip",
      buttons: [
        { extend:"copy",  text:"Copy",  title:filenameBase },
        { extend:"csv",   text:"CSV",   title:filenameBase, filename:filenameBase },
        { extend:"excel", text:"Excel", title:filenameBase, filename:filenameBase },
        { extend:"pdf",   text:"PDF",   title:filenameBase, filename:filenameBase,
          customize:(doc)=>{ doc.pageOrientation="landscape"; doc.pageMargins=[22,22,22,22]; } },
        { extend:"print", text:"In ấn", title:filenameBase }
      ],
      columns: [
        { data:"id",       title:"ID",        className:"col-id" },
        { data:"title",    title:"Tên sách",  className:"col-title",    render: clamp2 },
        { data:"author",   title:"Tác giả",   className:"col-author",   render: clamp2 },
        { data:"year",     title:"Năm",       className:"col-year" },
        { data:"category", title:"Thể loại",  className:"col-category", render: clamp2 }
      ],
      language:{
        processing:"Đang xử lý...", search:"Tìm:", lengthMenu:"Hiển thị _MENU_ dòng",
        info:"Trang _PAGE_ / _PAGES_ (tổng _TOTAL_ mục)", infoEmpty:"Không có dữ liệu",
        infoFiltered:"(lọc từ _MAX_ mục)", loadingRecords:"Đang tải...",
        zeroRecords:"Không tìm thấy kết quả phù hợp", emptyTable:"Bảng trống",
        paginate:{ first:"Đầu", previous:"Trước", next:"Sau", last:"Cuối" }
      }
    });
    table.columns.adjust();
    const search = document.getElementById("search");
    if(search){
      const run = debounce(()=>table.search(search.value).draw(), 180);
      search.addEventListener("input", run);
      search.addEventListener("keydown", e=>{ if(e.key==="Escape"){ search.value=""; table.search("").draw(); } });
    }
    const preview = ensurePreviewBox(); let hideTimer=null, lock=false;
    preview.addEventListener("mouseenter", ()=>{ lock=true; if(hideTimer) clearTimeout(hideTimer); });
    preview.addEventListener("mouseleave", ()=>{ lock=false; hideTimer=setTimeout(hide,120); });
    function show(rowEl, d, evt){
      if(!d.cover) return;
      preview.innerHTML = `
        <a href="${d.buy||'#'}" target="_blank" rel="noopener" aria-label="Mở liên kết mua: ${esc(d.title)}">
          <img src="${esc(d.cover)}" alt="Bìa: ${esc(d.title)}">
        </a>
        <div class="hint">Nhấp vào bìa để mở liên kết</div>`;
      preview.classList.add("show"); preview.setAttribute("aria-hidden","false");
      (evt && evt.clientX!=null) ? placePreviewAtPointer(preview, evt) : placePreviewNearRow(preview, rowEl);
    }
    function hide(){ if(lock) return; preview.classList.remove("show"); preview.setAttribute("aria-hidden","true"); preview.style.display="none"; preview.style.left="-9999px"; preview.style.top="-9999px"; }
    $("#tbl tbody").on("mouseenter","tr",function(evt){ if(hideTimer) clearTimeout(hideTimer); const d=table.row(this).data(); if(d) show(this,d,evt); })
                   .on("mouseleave","tr",function(){ hideTimer=setTimeout(hide,120); });
    document.addEventListener("scroll", ()=>hide(), {passive:true});
  }
  document.addEventListener("DOMContentLoaded", async ()=>{
    const books = await loadBooks();
    initTable(books);
  });
})();