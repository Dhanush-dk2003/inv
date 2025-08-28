import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMediaQuery } from 'react-responsive';

const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    invoiceDueDate: '',
    status: 'NOT PAID',
    customerDetails: '',
    billingAddress: '',
    shippingAddress: '',
    items: [{ id: 1, description: '', rate: '', quantity: '', gst: false }],
  });
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const isLargeScreen = useMediaQuery({ minWidth: 992 });
  const [signatureImg, setSignatureImg] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/sign.png';
    img.onload = () => setSignatureImg(img);
    img.onerror = () => console.log("Signature image failed to load");
  }, []);

  useEffect(() => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const storedDate = localStorage.getItem('invoiceDate');
    let seqNum = 1;

    if (storedDate === dateString) {
      seqNum = parseInt(localStorage.getItem('invoiceSequence') || '1', 10);
    } else {
      localStorage.setItem('invoiceDate', dateString);
      localStorage.setItem('invoiceSequence', '1');
    }

    const formattedDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const invoiceNum = `SKSY${formattedDate}${String(seqNum).padStart(2, '0')}`;

    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber: invoiceNum,
      invoiceDate: dateString,
    }));
    setSequenceNumber(seqNum);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id, field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: field === 'gst' ? !item.gst : value } : item
      ),
    }));
  };

  const addItem = () => {
    const newId = invoiceData.items.length > 0
      ? Math.max(...invoiceData.items.map(item => item.id)) + 1
      : 1;
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { id: newId, description: '', rate: '', quantity: '', gst: false }],
    }));
  };

  const removeItem = (id) => {
    if (invoiceData.items.length <= 1) return;
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const logoUrl = '/Sellerfly-min.png';
    const img = new Image();
    img.src = logoUrl;

    const continuePDFGeneration = () => {
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("INVOICE", 190, 20, { align: "right" });
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);

      doc.text("Number:", 145, 28);
      doc.text("Date:", 145, 34);
      doc.text("Due Date:", 145, 40);
      doc.text(`${invoiceData.invoiceNumber}`, 190, 28, { align: "right" });
      doc.text(`${invoiceData.invoiceDate}`, 190, 34, { align: "right" });
      doc.text(`${invoiceData.invoiceDueDate}`, 190, 40, { align: "right" });

      doc.setFillColor(invoiceData.status === "PAID" ? 0 : 255, invoiceData.status === "PAID" ? 150 : 0, 0);
      doc.setTextColor(255, 255, 255);
      doc.rect(160, 45, 30, 6, 'F');
      doc.text(invoiceData.status.toUpperCase(), 175, 49, { align: "center" });
      doc.setTextColor(0);
      doc.setFontSize(9);

      let yPos = 30;
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("SKSY SELLERFLY ONLINE SOLUTIONS LLP", 14, yPos + 5);
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      doc.text([
        "Covai Tech Park, No-102, Tower-1",
        "1st Floor, Kovai Thiru Nagar",
        "Coimbatore-641014",
        "TAMILNADU, INDIA",
        "Email: senthil.sellerfly@gmail.com",
        "Mobile: 6381780309",
        "GSTIN: 33AFNFS0333L1ZV"
      ], 14, yPos + 10);

      doc.line(14, yPos + 35, 196, yPos + 35);

      yPos += 45;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Customer", 14, yPos);
      doc.text("Billing Address", 80, yPos);
      doc.text("Shipping Address", 150, yPos);
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(invoiceData.customerDetails.split('\n'), 14, yPos + 5);
      doc.text(invoiceData.billingAddress.split('\n'), 80, yPos + 5);
      doc.text(invoiceData.shippingAddress.split('\n'), 150, yPos + 5);

      const rows = [];
      const hasGST = invoiceData.items.some(item => item.gst);
      let totalTaxable = 0;
      let gstTotal = 0;
      let grandTotal = 0;

      invoiceData.items.forEach((item, index) => {
        const rate = parseFloat(item.rate) || 0;
        const qty = parseFloat(item.quantity) || 0;
        const taxable = rate * qty;
        let gst = 0;
        let total = taxable;

        if (item.gst) {
          gst = taxable * 0.18;
          total += gst;
        }

        totalTaxable += taxable;
        gstTotal += gst;
        grandTotal += total;

        if (hasGST) {
          rows.push([
            index + 1,
            item.gst ? `${item.description}\nGST: 18%` : item.description,
            rate.toFixed(2),
            qty,
            taxable.toFixed(2),
            total.toFixed(2),
          ]);
        } else {
          rows.push([index + 1, item.description, rate.toFixed(2), qty, total.toFixed(2)]);
        }
      });

      const headers = hasGST
        ? [["S.No", "Description", "Rate", "Quantity", "Taxable", "Total"]]
        : [["S.No", "Description", "Rate", "Quantity", "Total"]];

      yPos += 30;

      autoTable(doc, {
        startY: yPos + 5,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.3 },
        headStyles: { fillColor: [189, 191, 193], textColor: 255, fontSize: 11, fontStyle: 'bold' },
        columnStyles: hasGST
          ? { 0: { cellWidth: 15 }, 1: { cellWidth: 60 }, 2: { cellWidth: 29 }, 3: { cellWidth: 22 }, 4: { cellWidth: 29 }, 5: { cellWidth: 29 } }
          : { 0: { cellWidth: 15 }, 1: { cellWidth: 80 }, 2: { cellWidth: 30 }, 3: { cellWidth: 25 }, 4: { cellWidth: 30 } },
      });

      let finalY = doc.lastAutoTable.finalY + 15;

      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("Bank Name:", 14, finalY);
      doc.text("Account Name:", 14, finalY + 4);
      doc.text("Account Number:", 14, finalY + 8);
      doc.text("IFSC Code:", 14, finalY + 12);
      doc.setFont(undefined, "normal");
      doc.text("SOUTH INDIAN BANK", 47, finalY);
      doc.text("SKSY SELLERFLY ONLINE SOLUTIONS LLP", 47, finalY + 4);
      doc.text("0753073000000635", 47, finalY + 8);
      doc.text("SIBL0000753", 47, finalY + 12);

      if (hasGST) {
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(`Taxable`, 150, finalY);
        doc.text(`GST`, 150, finalY + 5);
        doc.text(`Total`, 150, finalY + 10);
        doc.setFont(undefined, "normal");
        doc.text(`INR ${totalTaxable.toFixed(2)}`, 165, finalY);
        doc.text(`INR ${gstTotal.toFixed(2)}`, 165, finalY + 5);
        doc.text(`INR ${grandTotal.toFixed(2)}`, 165, finalY + 10);
        finalY += 25;
      } else {
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(`Total`, 150, finalY);
        doc.setFont(undefined, "normal");
        doc.text(`INR ${grandTotal.toFixed(2)}`, 165, finalY);
        finalY += 20;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, "italic");
      doc.text(`Total in Words: Indian Rupee ${convertNumberToWords(Math.round(grandTotal))} Only`, 196, finalY, { align: "right" });

      finalY += 40;
      doc.setFont(undefined, "normal");
      doc.text("For SKSY SELLERFLY ONLINE SOLUTIONS LLP", 196, finalY, { align: "right" });
      finalY += 5;

      if (signatureImg) {
        const signWidth = 40;
        const signHeight = (signatureImg.height * signWidth) / signatureImg.width;
        doc.addImage(signatureImg, 'PNG', 150, finalY, signWidth, signHeight);
        finalY += signHeight;
      } else {
        console.log("Signature image not available");
        finalY += 10;
      }

      doc.line(150, finalY, 196, finalY);
      finalY += 5;
      doc.text("Authorised Signatory", 196, finalY, { align: "right" });

      doc.line(14, 285, 196, 285);
      doc.text("Thank you for your business.", 105, 290, { align: "center" });

      const newSeqNum = sequenceNumber + 1;
      setSequenceNumber(newSeqNum);
      localStorage.setItem('invoiceSequence', newSeqNum.toString());

      doc.save(`Sellerfly_invoice_${invoiceData.invoiceNumber}.pdf`);
      // Reset form data
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const formattedDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const newInvoiceNum = `SKSY${formattedDate}${String(newSeqNum).padStart(2, '0')}`;

    setInvoiceData({
      invoiceNumber: newInvoiceNum,
      invoiceDate: dateString,
      invoiceDueDate: '',
      status: 'NOT PAID',
      customerDetails: '',
      billingAddress: '',
      shippingAddress: '',
      items: [{ id: 1, description: '', rate: '', quantity: '', gst: false }],
    });
    };

    img.onload = () => {
      const logoWidth = 40;
      const logoHeight = (img.height * logoWidth) / img.width;
      doc.addImage(img, 'PNG', 14, 10, logoWidth, logoHeight);
      continuePDFGeneration();
    };

    img.onerror = () => {
      console.log("Logo failed to load, using text fallback");
      doc.setFontSize(16);
      doc.text("SELLERFLY", 14, 20);
      continuePDFGeneration();
    };
  };

  const convertNumberToWords = (amount) => {
    const words = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const getWords = (n) => {
      if (n < 20) return words[n];
      const digit = n % 10;
      return tens[Math.floor(n / 10)] + (digit ? " " + words[digit] : "");
    };

    const numToWords = (num) => {
      if (num === 0) return "Zero";
      if (num > 999999999) return "Overflow";

      let result = "";
      const crore = Math.floor(num / 10000000);
      num %= 10000000;
      const lakh = Math.floor(num / 100000);
      num %= 100000;
      const thousand = Math.floor(num / 1000);
      num %= 1000;
      const hundred = Math.floor(num / 100);
      num %= 100;

      if (crore) result += getWords(crore) + " Crore ";
      if (lakh) result += getWords(lakh) + " Lakh ";
      if (thousand) result += getWords(thousand) + " Thousand ";
      if (hundred) result += words[hundred] + " Hundred ";
      if (num) result += (result !== "" ? "and " : "") + getWords(num);

      return result.trim();
    };

    return numToWords(amount);
  };

  return (
    <div className="d-flex flex-column flex-md-row">
      <div
        className="flex-grow-1 px-3 py-4"
        style={{ marginLeft: isLargeScreen ? "100px" : "0", marginRight: isLargeScreen ? "100px" : "0" }}
      >
        <div className="container-fluid">
          <h1 className="mb-4 mt-4">Invoice Generator</h1>
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="card-title border-bottom pb-2 mb-4">Invoice Form</h2>
              <div className="row mb-3">
                <div className="col-md-3">
                  <label className="form-label">Invoice Number</label>
                  <input
                    type="text"
                    className="form-control"
                    name="invoiceNumber"
                    value={invoiceData.invoiceNumber}
                    onChange={handleInputChange}
                    readOnly
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Invoice Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="invoiceDate"
                    value={invoiceData.invoiceDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="invoiceDueDate"
                    value={invoiceData.invoiceDueDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={invoiceData.status}
                    onChange={handleInputChange}
                  >
                    <option value="NOT PAID">NOT PAID</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label">Customer Details</label>
                  <textarea
                    className="form-control"
                    name="customerDetails"
                    rows="4"
                    value={invoiceData.customerDetails}
                    onChange={handleInputChange}
                    placeholder="Name, Phone, Email, GSTIN, POS"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Billing Address</label>
                  <textarea
                    className="form-control"
                    name="billingAddress"
                    rows="4"
                    value={invoiceData.billingAddress}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Shipping Address</label>
                  <textarea
                    className="form-control"
                    name="shippingAddress"
                    rows="4"
                    value={invoiceData.shippingAddress}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <h2 className="border-bottom pb-2 mb-3">Items</h2>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th className="text-center">S.No.</th>
                      <th className="text-center">Description</th>
                      <th className="text-center">Rate</th>
                      <th className="text-center">Quantity</th>
                      <th className="text-center">GST (18%)</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="text-center">{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Quantity"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={item.gst}
                            onChange={(e) => handleItemChange(item.id, 'gst', e.target.checked)}
                            style={{ width: '20px', height: '20px' }}
                          />
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => removeItem(item.id)}
                            disabled={invoiceData.items.length <= 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-end mb-3">
                <button className="btn btn-primary" onClick={addItem}>+ Add Item</button>
              </div>
              <div className="text-center mt-4">
                <button className="btn btn-success" onClick={generatePDF}>Generate PDF</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;
