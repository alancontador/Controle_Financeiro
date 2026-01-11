import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useReports } from "@/hooks/useReports";
import { ReportSummary } from "@/components/reports/ReportSummary";
import { CategoryBreakdown } from "@/components/reports/CategoryBreakdown";
import { MonthlyComparison } from "@/components/reports/MonthlyComparison";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { selectedMonth, previousMonths, loading, monthlyData } = useReports(selectedDate);

  const handlePreviousMonth = () => {
    setSelectedDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(selectedDate, 1);
    if (nextMonth <= new Date()) {
      setSelectedDate(nextMonth);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    toast({
      title: "Gerando PDF...",
      description: "Aguarde enquanto o relatório é preparado.",
    });

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#0a0a0f",
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add header
      pdf.setFillColor(15, 15, 23);
      pdf.rect(0, 0, 210, 20, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text("FinControl - Relatório Mensal", 15, 13);
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `${format(selectedDate, "MMMM yyyy", { locale: ptBR }).charAt(0).toUpperCase()}${format(
          selectedDate,
          "MMMM yyyy",
          { locale: ptBR }
        ).slice(1)}`,
        180,
        13,
        { align: "right" }
      );

      position = 25;
      heightLeft -= 25;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `relatorio-fincontrol-${format(selectedDate, "yyyy-MM")}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF exportado!",
        description: `O arquivo ${fileName} foi baixado com sucesso.`,
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isCurrentMonth =
    format(selectedDate, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8 pt-20 lg:pt-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  Relatórios
                </h1>
                <p className="text-muted-foreground text-sm">
                  Análise detalhada dos seus gastos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousMonth}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2 px-3 min-w-[160px] justify-center">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground font-medium">
                    {format(selectedDate, "MMMM yyyy", { locale: ptBR })
                      .charAt(0)
                      .toUpperCase() +
                      format(selectedDate, "MMMM yyyy", { locale: ptBR }).slice(1)}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={isCurrentMonth}
                  className="h-9 w-9"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExportPDF}
                disabled={isExporting || loading}
                className="bg-primary hover:bg-primary/90"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Exportar PDF
              </Button>
            </div>
          </motion.div>

          {/* Report Content */}
          <div ref={reportRef} className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <ReportSummary
                  currentMonth={selectedMonth}
                  previousMonth={previousMonths[0] || null}
                />

                {/* Category Breakdown */}
                <CategoryBreakdown
                  categories={selectedMonth?.categoriesExpenses || []}
                  totalExpense={selectedMonth?.totalExpense || 0}
                />

                {/* Monthly Comparison */}
                <MonthlyComparison
                  currentMonth={selectedMonth}
                  previousMonths={previousMonths}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
