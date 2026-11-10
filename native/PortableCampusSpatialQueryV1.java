import com.supermap.data.*;
import com.supermap.analyst.spatialanalyst.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** New dual-campus spatial task. No traffic engine or license configuration writes. */
public final class PortableCampusSpatialQueryV1 {
    public static void main(String[] args) throws Exception {
        Path dir=Paths.get(args[0]);
        String[] e=Files.readAllLines(dir.resolve("event.tsv"),StandardCharsets.UTF_8).get(0).split("\t");
        if(e.length!=4)throw new IllegalStateException("event schema");
        double x=Double.parseDouble(e[0]),y=Double.parseDouble(e[1]),radius=Double.parseDouble(e[2]);int expected=Integer.parseInt(e[3]);
        if(!Double.isFinite(x)||!Double.isFinite(y)||!(radius==50||radius==100||radius==150||radius==200)||(expected!=20&&expected!=22))throw new IllegalStateException("domain");
        List<String> rows=Files.readAllLines(dir.resolve("roads.tsv"),StandardCharsets.UTF_8);
        if(rows.size()!=expected)throw new IllegalStateException("road count");
        Workspace workspace=new Workspace();
        PrjCoordSys crs=new PrjCoordSys();if(!crs.fromEPSGCode(4547))throw new IllegalStateException("CRS");
        GeoPoint center=new GeoPoint(x,y);BufferAnalystParameter p=new BufferAnalystParameter();
        p.setEndType(BufferEndType.ROUND);p.setLeftDistance(radius);p.setSemicircleLineSegment(120);
        GeoRegion buffer=BufferAnalystGeometry.createBuffer(center,p,crs);if(buffer==null)throw new IllegalStateException("buffer");
        List<String> result=new ArrayList<String>();result.add("edge\tintersects");Set<String> seen=new HashSet<String>();
        for(String row:rows){
            String[] cols=row.split("\t");if(cols.length!=2||!seen.add(cols[0]))throw new IllegalStateException("road schema");
            String[] pairs=cols[1].split(";");if(pairs.length<2)throw new IllegalStateException("geometry");Point2D[] xy=new Point2D[pairs.length];
            for(int i=0;i<pairs.length;i++){String[] v=pairs[i].split(",");double xx=Double.parseDouble(v[0]),yy=Double.parseDouble(v[1]);if(!Double.isFinite(xx)||!Double.isFinite(yy))throw new IllegalStateException("finite");xy[i]=new Point2D(xx,yy);}
            GeoLine line=new GeoLine(new Point2Ds(xy));boolean hit=Geometrist.hasIntersection(buffer,line);
            if(Toolkit.getAllErrors()!=null&&Toolkit.getAllErrors().length>0)throw new IllegalStateException("SDK error");
            result.add(cols[0]+"\t"+hit);line.dispose();
        }
        Files.write(dir.resolve("relations.tsv"),result,StandardCharsets.UTF_8,StandardOpenOption.CREATE_NEW);
        buffer.dispose();center.dispose();workspace.dispose();
    }
}
